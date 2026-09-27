package plant.stay.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import plant.stay.dto.request.BookingRequestDto;
import plant.stay.dto.request.PublicGroupBookingRequestDTO;
import plant.stay.exception.BusinessException;
import plant.stay.model.BookingRequestStatus;
import plant.stay.model.PublicGroupBookingRequestStatus;
import plant.stay.repository.BookingRequestRepository;
import plant.stay.repository.PublicGroupBookingRequestRepository;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dịch vụ kiểm soát và phòng chống spam / bot cho cổng đặt phòng trực tuyến.
 * Bao gồm:
 * 1. Bẫy Honeypot ẩn (phát hiện bot tự động điền form).
 * 2. Giới hạn tần suất gửi yêu cầu theo địa chỉ IP (Rate Limiting với Sliding Window & Cooldown).
 * 3. Kiểm soát thời gian thao tác điền biểu mẫu (phát hiện submit bất thường < 2 giây).
 * 4. Ngăn chặn spam dồn dập theo số điện thoại (giới hạn số yêu cầu PENDING đang chờ xử lý).
 * 5. Chặn gửi yêu cầu trùng lặp trong thời gian ngắn (cùng SĐT, cùng hạng phòng, cùng ngày).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PublicBookingAntiSpamService {

    private final BookingRequestRepository bookingRequestRepository;
    private final PublicGroupBookingRequestRepository publicGroupBookingRequestRepository;

    // Cấu hình chống spam
    private static final long MIN_SUBMISSION_ELAPSED_MS = 2000L; // Tối thiểu 2 giây để người dùng điền form
    private static final long MIN_IP_COOLDOWN_SECONDS = 8L;      // Tối thiểu 8 giây giữa 2 lần gửi từ cùng 1 IP
    private static final int MAX_REQUESTS_PER_WINDOW = 5;        // Tối đa 5 yêu cầu trong 10 phút từ 1 IP
    private static final Duration WINDOW_DURATION = Duration.ofMinutes(10);
    private static final int MAX_PENDING_PER_PHONE = 3;          // Tối đa 3 yêu cầu cá nhân đang chờ duyệt cho 1 SĐT
    private static final int MAX_PENDING_GROUP_PER_PHONE = 2;    // Tối đa 2 yêu cầu đoàn đang chờ duyệt cho 1 SĐT
    private static final long DUPLICATE_CHECK_MINUTES = 5L;       // Khoảng thời gian chống gửi lặp (phút)

    // Bộ nhớ đệm lưu lịch sử request theo IP
    private final Map<String, Deque<Instant>> ipRequestTimestamps = new ConcurrentHashMap<>();
    private final Map<String, Instant> ipLastSubmission = new ConcurrentHashMap<>();

    /**
     * Xác thực và kiểm tra chống spam cho yêu cầu đặt phòng cá nhân.
     */
    public void validateIndividualBooking(BookingRequestDto req, HttpServletRequest httpServletRequest) {
        // 1. Kiểm tra Bẫy Honeypot
        checkHoneypot(req.getWebsiteTrap(), req.getPhone());

        // 2. Kiểm tra thời gian điền form
        checkSubmissionSpeed(req.getSubmissionElapsedMs(), req.getPhone());

        // 3. Kiểm tra tần suất theo địa chỉ IP
        String clientIp = extractClientIp(httpServletRequest);
        checkIpRateLimit(clientIp);

        // 4. Kiểm tra số lượng yêu cầu PENDING theo số điện thoại
        String cleanPhone = cleanPhone(req.getPhone());
        long pendingCount = bookingRequestRepository.countByPhoneAndStatus(cleanPhone, BookingRequestStatus.PENDING);
        if (pendingCount >= MAX_PENDING_PER_PHONE) {
            log.warn("Rate limit by phone exceeded for phone: {} (pending count: {})", cleanPhone, pendingCount);
            throw new BusinessException(
                    "Số điện thoại này hiện có " + pendingCount + " yêu cầu đặt phòng đang chờ khách sạn liên hệ xác nhận. " +
                    "Để đảm bảo quyền lợi, quý khách vui lòng không gửi lặp lại hoặc liên hệ trực tiếp hotline để được phục vụ nhanh nhất.",
                    HttpStatus.TOO_MANY_REQUESTS
            );
        }

        // 5. Kiểm tra gửi trùng lặp thông tin
        LocalDateTime duplicateThreshold = LocalDateTime.now().minusMinutes(DUPLICATE_CHECK_MINUTES);
        boolean isDuplicate = bookingRequestRepository.existsByPhoneAndRoomTypeIdAndCheckInDateAndCreatedAtAfter(
                cleanPhone, req.getRoomTypeId(), req.getCheckInDate(), duplicateThreshold
        );
        if (isDuplicate) {
            log.warn("Duplicate booking request rejected for phone: {}, roomTypeId: {}, checkInDate: {}",
                    cleanPhone, req.getRoomTypeId(), req.getCheckInDate());
            throw new BusinessException(
                    "Yêu cầu đặt phòng của quý khách cho hạng phòng và ngày nhận này đã được tiếp nhận cách đây ít phút. " +
                    "Nhân viên khách sạn sẽ liên hệ xác nhận sớm nhất, quý khách vui lòng không gửi trùng lặp.",
                    HttpStatus.CONFLICT
            );
        }

        // Ghi nhận request hợp lệ từ IP
        recordIpSuccess(clientIp);
    }

    /**
     * Xác thực và kiểm tra chống spam cho yêu cầu đặt phòng đoàn.
     */
    public void validateGroupBooking(PublicGroupBookingRequestDTO req, HttpServletRequest httpServletRequest) {
        // 1. Kiểm tra Bẫy Honeypot
        checkHoneypot(req.getWebsiteTrap(), req.getPhone());

        // 2. Kiểm tra thời gian điền form
        checkSubmissionSpeed(req.getSubmissionElapsedMs(), req.getPhone());

        // 3. Kiểm tra tần suất theo địa chỉ IP
        String clientIp = extractClientIp(httpServletRequest);
        checkIpRateLimit(clientIp);

        // 4. Kiểm tra số lượng yêu cầu PENDING theo số điện thoại
        String cleanPhone = cleanPhone(req.getPhone());
        long pendingCount = publicGroupBookingRequestRepository.countByPhoneAndStatus(cleanPhone, PublicGroupBookingRequestStatus.PENDING);
        if (pendingCount >= MAX_PENDING_GROUP_PER_PHONE) {
            log.warn("Rate limit by phone exceeded for group booking phone: {} (pending: {})", cleanPhone, pendingCount);
            throw new BusinessException(
                    "Số điện thoại này hiện có yêu cầu đặt phòng đoàn đang chờ khách sạn liên hệ xử lý. " +
                    "Quý khách vui lòng không gửi lặp lại hoặc liên hệ trực tiếp hotline để được hỗ trợ nhanh nhất.",
                    HttpStatus.TOO_MANY_REQUESTS
            );
        }

        // 5. Kiểm tra trùng lặp đặt phòng đoàn cùng ngày nhận
        LocalDateTime duplicateThreshold = LocalDateTime.now().minusMinutes(DUPLICATE_CHECK_MINUTES);
        boolean isDuplicate = publicGroupBookingRequestRepository.existsByPhoneAndCheckInDateAndCreatedAtAfter(
                cleanPhone, req.getCheckInDate(), duplicateThreshold
        );
        if (isDuplicate) {
            log.warn("Duplicate group booking request rejected for phone: {}, checkInDate: {}", cleanPhone, req.getCheckInDate());
            throw new BusinessException(
                    "Yêu cầu đặt phòng đoàn của quý khách đã được tiếp nhận cách đây ít phút. " +
                    "Bộ phận kinh doanh sẽ liên hệ sớm nhất, quý khách vui lòng không gửi trùng lặp.",
                    HttpStatus.CONFLICT
            );
        }

        // Ghi nhận request hợp lệ từ IP
        recordIpSuccess(clientIp);
    }

    /**
     * Kiểm tra bẫy Honeypot: Nếu trường này có giá trị (bị bot tự động điền), từ chối ngay.
     */
    private void checkHoneypot(String honeypot, String phone) {
        if (honeypot != null && !honeypot.trim().isEmpty()) {
            log.warn("Spam bot detected via honeypot trap for phone: {}, content: {}", phone, honeypot);
            throw new BusinessException("Yêu cầu không hợp lệ. Đã phát hiện thao tác bất thường từ trình duyệt.", HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Kiểm tra thời gian hoàn tất biểu mẫu.
     */
    private void checkSubmissionSpeed(Long elapsedMs, String phone) {
        if (elapsedMs != null && elapsedMs > 0 && elapsedMs < MIN_SUBMISSION_ELAPSED_MS) {
            log.warn("Submission too fast ({} ms) for phone: {}. Likely automated bot script.", elapsedMs, phone);
            throw new BusinessException("Thao tác gửi yêu cầu quá nhanh. Quý khách vui lòng kiểm tra lại thông tin trước khi gửi.", HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    /**
     * Kiểm tra giới hạn tần suất theo IP (Cooldown & Sliding Window).
     */
    private synchronized void checkIpRateLimit(String clientIp) {
        Instant now = Instant.now();

        // 1. Kiểm tra Cooldown giữa 2 lần gửi liên tiếp
        Instant lastSubmission = ipLastSubmission.get(clientIp);
        if (lastSubmission != null) {
            long secondsSinceLast = Duration.between(lastSubmission, now).getSeconds();
            if (secondsSinceLast < MIN_IP_COOLDOWN_SECONDS) {
                log.warn("IP cooldown violation for IP: {} ({} seconds since last request)", clientIp, secondsSinceLast);
                throw new BusinessException(
                        "Quý khách đang thao tác quá nhanh. Vui lòng chờ ít giây trước khi thực hiện lại.",
                        HttpStatus.TOO_MANY_REQUESTS
                );
            }
        }

        // 2. Kiểm tra Sliding Window trong 10 phút
        Deque<Instant> timestamps = ipRequestTimestamps.computeIfAbsent(clientIp, k -> new ArrayDeque<>());
        Instant windowStart = now.minus(WINDOW_DURATION);

        // Xóa các mốc thời gian ngoài cửa sổ 10 phút
        while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(windowStart)) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= MAX_REQUESTS_PER_WINDOW) {
            log.warn("IP rate limit exceeded for IP: {} ({} requests in last 10 minutes)", clientIp, timestamps.size());
            throw new BusinessException(
                    "Quý khách đã gửi quá nhiều yêu cầu trong thời gian ngắn. " +
                    "Vui lòng thử lại sau 10 phút hoặc liên hệ trực tiếp hotline để được phục vụ tức thì.",
                    HttpStatus.TOO_MANY_REQUESTS
            );
        }
    }

    /**
     * Ghi nhận lượt gửi thành công từ IP để tính toán tần suất.
     */
    private synchronized void recordIpSuccess(String clientIp) {
        Instant now = Instant.now();
        ipLastSubmission.put(clientIp, now);
        Deque<Instant> timestamps = ipRequestTimestamps.computeIfAbsent(clientIp, k -> new ArrayDeque<>());
        timestamps.addLast(now);
    }

    /**
     * Trích xuất địa chỉ IP thực tế của client qua các header Proxy/Load Balancer.
     */
    public String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return "127.0.0.1";
        }
        String[] headers = {
                "X-Forwarded-For",
                "X-Real-IP",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP",
                "HTTP_CLIENT_IP",
                "HTTP_X_FORWARDED_FOR",
                "CF-Connecting-IP"
        };
        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isEmpty()) ? remoteAddr : "127.0.0.1";
    }

    /**
     * Chuẩn hóa số điện thoại để so sánh.
     */
    private String cleanPhone(String phone) {
        if (phone == null) return "";
        return phone.trim().replaceAll("\\s+", "");
    }

    /**
     * Định kỳ dọn dẹp các IP đã quá hạn 30 phút để giải phóng bộ nhớ.
     */
    @Scheduled(fixedDelay = 1800000) // Chạy mỗi 30 phút
    public synchronized void purgeStaleIpRecords() {
        Instant purgeThreshold = Instant.now().minus(Duration.ofMinutes(30));
        ipRequestTimestamps.entrySet().removeIf(entry -> {
            Deque<Instant> deque = entry.getValue();
            while (!deque.isEmpty() && deque.peekFirst().isBefore(purgeThreshold)) {
                deque.pollFirst();
            }
            return deque.isEmpty();
        });
        ipLastSubmission.entrySet().removeIf(entry -> entry.getValue().isBefore(purgeThreshold));
    }

    /**
     * Dùng cho testing: Xóa trắng cache rate limit.
     */
    public synchronized void clearRateLimits() {
        ipRequestTimestamps.clear();
        ipLastSubmission.clear();
    }
}
