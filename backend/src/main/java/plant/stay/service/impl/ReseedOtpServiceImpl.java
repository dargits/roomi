package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import plant.stay.service.ReseedOtpService;
import plant.stay.service.TelegramBackupService;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Triển khai OTP service cho tính năng tái tạo dữ liệu mẫu.
 * - OTP gồm 6 chữ số ngẫu nhiên, hết hạn sau 5 phút.
 * - Được gửi qua tất cả Chat ID Telegram đã cấu hình.
 * - Dùng in-memory (AtomicReference) — phù hợp single-instance, không cần Redis.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReseedOtpServiceImpl implements ReseedOtpService {

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int OTP_LENGTH = 6;

    private final TelegramBackupService telegramBackupService;

    /** Lưu OTP hiện tại (mã + thời điểm hết hạn). Null nếu không có OTP đang hoạt động. */
    private final AtomicReference<OtpEntry> currentOtp = new AtomicReference<>(null);

    private static final SecureRandom RANDOM = new SecureRandom();

    // =========================================================================
    // Public API
    // =========================================================================

    @Override
    public boolean generateAndSendOtp(String adminName) {
        if (!telegramBackupService.isConfigured()) {
            log.error("Telegram Bot chưa được cấu hình — không thể gửi OTP tái tạo dữ liệu");
            throw new plant.stay.exception.BusinessException(
                    "Telegram Bot chưa được cấu hình. Vui lòng kiểm tra cài đặt Bot Token và Chat ID trước khi sử dụng tính năng này.");
        }

        String otp = generateOtpCode();
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES);
        currentOtp.set(new OtpEntry(otp, expiry));

        String message = buildOtpMessage(adminName, otp);

        try {
            String result = telegramBackupService.testSendToAll(message);
            log.info("Đã gửi OTP tái tạo dữ liệu qua Telegram. Kết quả: {}", result);
            return true;
        } catch (Exception e) {
            currentOtp.set(null); // rollback nếu gửi thất bại
            log.error("Lỗi khi gửi OTP tái tạo dữ liệu qua Telegram: {}", e.getMessage());
            throw new plant.stay.exception.BusinessException(
                    "Không thể gửi OTP qua Telegram: " + e.getMessage());
        }
    }

    @Override
    public boolean verifyOtp(String otp) {
        if (otp == null || otp.isBlank()) {
            return false;
        }

        OtpEntry entry = currentOtp.get();
        if (entry == null) {
            log.warn("Xác minh OTP thất bại: không có OTP nào đang hoạt động");
            return false;
        }

        if (LocalDateTime.now().isAfter(entry.expiry())) {
            currentOtp.set(null);
            log.warn("Xác minh OTP thất bại: OTP đã hết hạn");
            return false;
        }

        boolean valid = entry.code().equals(otp.trim());
        if (valid) {
            currentOtp.set(null); // xóa OTP sau khi dùng thành công (one-time use)
            log.info("OTP tái tạo dữ liệu đã được xác minh thành công");
        } else {
            log.warn("Xác minh OTP thất bại: mã không đúng");
        }
        return valid;
    }

    @Override
    public void invalidateOtp() {
        currentOtp.set(null);
        log.info("OTP tái tạo dữ liệu đã bị hủy bỏ");
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private String generateOtpCode() {
        int code = RANDOM.nextInt(900_000) + 100_000; // luôn 6 chữ số (100000 - 999999)
        return String.valueOf(code);
    }

    private String buildOtpMessage(String adminName, String otp) {
        return String.format(
                "🔐 *XÁC THỰC TÁI TẠO DỮ LIỆU MẪU*\n\n" +
                "⚠️ Người thực hiện: *%s*\n" +
                "🕐 Thời gian yêu cầu: %s\n\n" +
                "📌 Mã OTP của bạn là:\n\n" +
                "     ` %s `\n\n" +
                "⏱ OTP có hiệu lực trong *%d phút*.\n" +
                "❌ Nếu không phải bạn yêu cầu, hãy bỏ qua tin nhắn này.",
                adminName != null ? adminName : "Quản trị viên",
                LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")),
                otp,
                OTP_EXPIRY_MINUTES
        );
    }

    // =========================================================================
    // Inner record
    // =========================================================================

    /** Lưu trữ OTP và thời điểm hết hạn */
    private record OtpEntry(String code, LocalDateTime expiry) {}
}
