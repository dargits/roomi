package plant.stay.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import plant.stay.model.Session;
import plant.stay.model.User;
import plant.stay.repository.SessionRepository;

import java.util.Optional;

@Component
public class AuthUtil {

    private final SessionRepository sessionRepository;

    @Autowired
    public AuthUtil(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
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
     */
    public User getUserFromToken(String token) {
        Optional<Session> sessionOpt = sessionRepository.findBySession(token);
        return sessionOpt.map(Session::getUser).orElse(null);
    }

    /**
     * Trích xuất token từ header Authorization của request.
     */
    public String extractToken(HttpServletRequest request) {
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
}
