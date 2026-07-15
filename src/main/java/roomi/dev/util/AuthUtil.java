package roomi.dev.util;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.User;
import roomi.dev.repository.SessionRepository;
import roomi.dev.repository.UserRepository;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class AuthUtil {
    
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    
    /**
     * Lấy thông tin user từ token
     */
    public User getUserFromToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw new BusinessException("Token không hợp lệ", ErrorCode.SESSION_INVALID);
        }
        
        // Tìm session hợp lệ
        return sessionRepository.findValidSession(token, LocalDateTime.now())
                .flatMap(session -> userRepository.findById(session.getUserId()))
                .orElseThrow(() -> new BusinessException("Session không hợp lệ hoặc đã hết hạn", ErrorCode.SESSION_EXPIRED));
    }
    
    /**
     * Kiểm tra token có hợp lệ không
     */
    public boolean isValidToken(String token) {
        try {
            getUserFromToken(token);
            return true;
        } catch (BusinessException e) {
            return false;
        }
    }
}