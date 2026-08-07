package roomi.dev.util;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.User;
import roomi.dev.repository.SessionRepository;
import roomi.dev.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Arrays;

/**
 * Tiện ích xác thực và kiểm tra quyền hạn.
 *
 * Cơ chế auth của hệ thống: session-based (UUID token lưu trong DB).
 * Token được gửi qua header Authorization — không có prefix "Bearer ".
 *
 * Hai helper chính:
 *   - requireAuth(token)             — xác nhận đăng nhập, trả về User
 *   - requireRoles(token, roles...)  — xác nhận đăng nhập + kiểm tra role
 */
@Component
@RequiredArgsConstructor
public class AuthUtil {

    private final SessionRepository sessionRepository;
    private final UserRepository    userRepository;

    // ------------------------------------------------------------------ PUBLIC API

    /**
     * Lấy thông tin user từ token (session-based).
     * Ném SESSION_EXPIRED nếu token không tồn tại hoặc hết hạn.
     *
     * @param token  giá trị UUID token gửi trong header Authorization
     * @return       User hiện tại
     */
    public User getUserFromToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw new BusinessException("Token không hợp lệ", ErrorCode.SESSION_INVALID);
        }

        // Tra cứu session còn hạn trong DB
        return sessionRepository.findValidToken(token, LocalDateTime.now())
                .flatMap(session -> userRepository.findById(session.getUserId()))
                .orElseThrow(() -> new BusinessException(
                        "Session không hợp lệ hoặc đã hết hạn", ErrorCode.SESSION_EXPIRED));
    }

    /**
     * Xác thực token — bất kỳ role nào (chỉ cần đăng nhập).
     * Dùng cho các endpoint mọi nhân viên đều truy cập được.
     *
     * @param token  header Authorization
     * @return       User hiện tại
     */
    public User requireAuth(String token) {
        User user = getUserFromToken(token);
        requireActive(user);
        return user;
    }

    /**
     * Xác thực token + kiểm tra role.
     * Ném INSUFFICIENT_PRIVILEGES nếu role không nằm trong danh sách cho phép.
     *
     * Ví dụ: authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST)
     *
     * @param token        header Authorization
     * @param allowedRoles danh sách role được phép
     * @return             User hiện tại
     */
    public User requireRoles(String token, User.Role... allowedRoles) {
        User user = getUserFromToken(token);
        requireActive(user);

        boolean hasRole = Arrays.stream(allowedRoles)
                .anyMatch(r -> r == user.getRole());

        if (!hasRole) {
            throw new BusinessException(
                    "Bạn không có quyền thực hiện hành động này", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }
        return user;
    }

    /**
     * Kiểm tra token có hợp lệ không (không ném exception).
     * Dùng cho guard logic trong filter hoặc scheduled task.
     */
    public boolean isValidToken(String token) {
        try {
            getUserFromToken(token);
            return true;
        } catch (BusinessException e) {
            return false;
        }
    }

    // ------------------------------------------------------------------ PRIVATE HELPERS

    /** Đảm bảo tài khoản không bị khóa trước khi cho phép truy cập. */
    private void requireActive(User user) {
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new BusinessException("Tài khoản đã bị khóa", ErrorCode.ACCESS_DENIED);
        }
    }
}
