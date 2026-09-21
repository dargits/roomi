package plant.stay.util;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.HotelSetting;
import plant.stay.model.Session;
import plant.stay.model.User;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.repository.SessionRepository;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
@Slf4j
public class AuthUtil {

    private final SessionRepository sessionRepository;
    private final HotelSettingRepository hotelSettingRepository;

    @Autowired
    public AuthUtil(SessionRepository sessionRepository,
                    @Autowired(required = false) HotelSettingRepository hotelSettingRepository) {
        this.sessionRepository = sessionRepository;
        this.hotelSettingRepository = hotelSettingRepository;
    }

    /**
     * Lấy người dùng từ token (session string) trong header của request.
     * Token có thể được gửi trong header "Authorization" với dạng "Bearer <token>" hoặc gửi trực tiếp.
     */
    public User getUserFromRequest(HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null || token.isEmpty()) {
            return null;
        }
        return getUserFromToken(token);
    }

    /**
     * Lấy người dùng tương ứng từ token (chuỗi session).
     * Kiểm tra trạng thái phiên (REVOKED, EXPIRED, TIMEOUT) và tài khoản active.
     */
    public User getUserFromToken(String token) {
        Optional<Session> sessionOpt = sessionRepository.findBySession(token);
        if (sessionOpt.isEmpty()) {
            return null;
        }

        Session session = sessionOpt.get();

        // 1. Kiểm tra nếu phiên đã bị buộc đăng xuất (NCL-10-CN-007)
        if ("REVOKED".equalsIgnoreCase(session.getStatus())) {
            String reason = session.getRevokedReason() != null && !session.getRevokedReason().trim().isEmpty()
                    ? session.getRevokedReason()
                    : "Phiên đăng nhập đã bị Quản trị viên kết thúc từ xa.";
            throw new UnauthorizedException(reason);
        }

        if ("EXPIRED".equalsIgnoreCase(session.getStatus())) {
            throw new UnauthorizedException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }

        User user = session.getUser();
        if (user == null || !user.isActive()) {
            throw new UnauthorizedException("Tài khoản đã bị khóa hoặc không tồn tại.");
        }

        // 2. Kiểm tra thời hạn hiệu lực tối đa của phiên (Absolute Lifetime cấu hình bởi Chủ cơ sở)
        int maxLifetimeHours = getMaxSessionLifetimeHours();
        if (session.getCreateAt() != null && session.getCreateAt().plusHours(maxLifetimeHours).isBefore(LocalDateTime.now())) {
            session.setStatus("EXPIRED");
            session.setRevokedReason("Phiên đăng nhập đã hết hạn sau " + maxLifetimeHours + " giờ.");
            session.setRevokedAt(LocalDateTime.now());
            sessionRepository.save(session);
            throw new UnauthorizedException("Phiên làm việc đã hết hạn sau " + maxLifetimeHours + " giờ. Vui lòng đăng nhập lại.");
        }

        // 3. Kiểm tra thời gian chờ không thao tác (Session Timeout cấu hình bởi Chủ cơ sở)
        int timeoutMinutes = getSessionTimeoutMinutes();
        LocalDateTime lastActive = session.getLastActiveAt() != null ? session.getLastActiveAt() : session.getCreateAt();
        if (lastActive != null && lastActive.plusMinutes(timeoutMinutes).isBefore(LocalDateTime.now())) {
            session.setStatus("EXPIRED");
            session.setRevokedReason("Hết hạn do không thao tác quá " + timeoutMinutes + " phút");
            session.setRevokedAt(LocalDateTime.now());
            sessionRepository.save(session);
            throw new UnauthorizedException("Phiên làm việc đã hết hạn sau " + timeoutMinutes + " phút không thao tác.");
        }

        // 4. Throttled update lastActiveAt (tối đa cập nhật 1 lần mỗi 1 phút để tối ưu hiệu năng)
        LocalDateTime now = LocalDateTime.now();
        if (session.getLastActiveAt() == null || session.getLastActiveAt().isBefore(now.minusMinutes(1))) {
            session.setLastActiveAt(now);
            try {
                sessionRepository.save(session);
            } catch (Exception e) {
                log.debug("Không thể cập nhật lastActiveAt cho phiên: {}", e.getMessage());
            }
        }

        return user;
    }

    /**
     * Lấy cấu hình thời gian hết hạn phiên do không thao tác (phút) từ HotelSetting, mặc định 120 phút.
     */
    public int getSessionTimeoutMinutes() {
        if (hotelSettingRepository == null) {
            return 120;
        }
        try {
            return hotelSettingRepository.findById(1L)
                    .map(HotelSetting::getSessionTimeoutMinutes)
                    .filter(m -> m != null && m > 0)
                    .orElse(120);
        } catch (Exception e) {
            return 120;
        }
    }

    /**
     * Lấy cấu hình thời hạn tối đa của một phiên (giờ) từ HotelSetting, mặc định 24 giờ.
     */
    public int getMaxSessionLifetimeHours() {
        if (hotelSettingRepository == null) {
            return 24;
        }
        try {
            return hotelSettingRepository.findById(1L)
                    .map(HotelSetting::getMaxSessionLifetimeHours)
                    .filter(h -> h != null && h > 0)
                    .orElse(24);
        } catch (Exception e) {
            return 24;
        }
    }

    /**
     * Lấy cấu hình số phiên đăng nhập đồng thời tối đa trên 1 tài khoản.
     * 0: Không giới hạn. 1: Phiên duy nhất. > 1: Tối đa N phiên.
     */
    public int getMaxConcurrentSessions() {
        if (hotelSettingRepository == null) {
            return 0;
        }
        try {
            return hotelSettingRepository.findById(1L)
                    .map(HotelSetting::getMaxConcurrentSessions)
                    .filter(c -> c != null && c >= 0)
                    .orElse(0);
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Trích xuất token từ header Authorization của request.
     */
    public String extractToken(HttpServletRequest request) {
        if (request == null) return null;
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        // Fallback: nếu token được gửi trực tiếp qua một header khác, ví dụ "Token"
        String fallbackToken = request.getHeader("Token");
        if (fallbackToken != null) {
            return fallbackToken;
        }
        return bearerToken;
    }

    /**
     * Trích xuất địa chỉ IP của Client (xử lý proxy / load balancer).
     */
    public static String extractClientIp(HttpServletRequest request) {
        if (request == null) return "Unknown";
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            ip = "127.0.0.1";
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip != null ? ip : "Unknown";
    }

    /**
     * Phân tích tóm tắt thông tin thiết bị và trình duyệt từ User-Agent header.
     */
    public static String parseDeviceInfo(String userAgent) {
        if (userAgent == null || userAgent.isEmpty()) {
            return "Không xác định";
        }

        String os = "Thiết bị khác";
        String browser = "Trình duyệt khác";

        // Nhận diện HĐH
        String lowerUA = userAgent.toLowerCase();
        if (lowerUA.contains("windows nt 10.0") || lowerUA.contains("windows nt 11.0")) {
            os = "Windows";
        } else if (lowerUA.contains("windows")) {
            os = "Windows";
        } else if (lowerUA.contains("macintosh") || lowerUA.contains("mac os x")) {
            os = "macOS";
        } else if (lowerUA.contains("iphone")) {
            os = "iPhone (iOS)";
        } else if (lowerUA.contains("ipad")) {
            os = "iPad (iPadOS)";
        } else if (lowerUA.contains("android")) {
            os = "Android";
        } else if (lowerUA.contains("linux")) {
            os = "Linux";
        }

        // Nhận diện Trình duyệt
        if (lowerUA.contains("edg/")) {
            browser = "Microsoft Edge";
        } else if (lowerUA.contains("chrome/") && !lowerUA.contains("edg/")) {
            browser = "Google Chrome";
        } else if (lowerUA.contains("safari/") && !lowerUA.contains("chrome/")) {
            browser = "Apple Safari";
        } else if (lowerUA.contains("firefox/")) {
            browser = "Mozilla Firefox";
        } else if (lowerUA.contains("postman")) {
            browser = "Postman API";
        }

        return browser + " (" + os + ")";
    }
}
