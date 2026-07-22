package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.dto.request.LoginRequest;
import roomi.dev.dto.request.RegisterRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.LoginResponse;
import roomi.dev.dto.response.RegisterResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Session;
import roomi.dev.model.User;
import roomi.dev.repository.SessionRepository;
import roomi.dev.repository.UserRepository;
import roomi.dev.service.AuthService;
import roomi.dev.util.PasswordHelper;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;

    @Override
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessException("Username đã tồn tại", ErrorCode.USERNAME_ALREADY_EXISTS);
        }
        
        if (request.getPhone() != null && userRepository.existsByPhone(request.getPhone())) {
            throw new BusinessException("Số điện thoại đã tồn tại", ErrorCode.PHONE_ALREADY_EXISTS);
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .username(request.getUsername())
                .passwordHash(PasswordHelper.encode(request.getPassword()))
                .role(User.Role.RECEPTIONIST) // Default role
                .phone(request.getPhone())
                .build();

        user = userRepository.save(user);
        String sessionId = createSession(user);
        
        return RegisterResponse.builder()
                .mess("Đăng ký thành công")
                .token(sessionId)
                .build();
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BusinessException("Username hoặc mật khẩu không đúng", ErrorCode.INVALID_CREDENTIALS));

        if (!PasswordHelper.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException("Username hoặc mật khẩu không đúng", ErrorCode.INVALID_CREDENTIALS);
        }

        // Kiểm tra tài khoản có bị khóa không
        if (!user.getActive()) {
            throw new BusinessException("Tài khoản đã bị khóa", ErrorCode.ACCESS_DENIED);
        }

        sessionRepository.findByUserId(user.getId()).ifPresent(sessionRepository::delete);
        String sessionId = createSession(user);
        
        return LoginResponse.builder()
                .mess("Đăng nhập thành công")
                .token(sessionId)
                .role(user.getRole().toString())
                .build();
    }

    @Override
    public void logout(String sessionId) {
        sessionRepository.findByToken(sessionId).ifPresent(sessionRepository::delete);
    }

    @Override
    public BaseResponse changePassword(User u, String newPassword) {
        String password = PasswordHelper.encode(newPassword);
        u.setPasswordHash(password);
        userRepository.save(u);
        return BaseResponse.builder().mess("Đổi mật khẩu thành công.").data(null).build();
    }

    private String createSession(User user) {
        String sessionId = UUID.randomUUID().toString();
        
        Session session = Session.builder()
                .token(sessionId)
                .createAt(LocalDateTime.now())
                .expriationAt(LocalDateTime.now().plusHours(24))
                .userId(user.getId())
                .build();
        
        sessionRepository.save(session);
        return sessionId;
    }

    public void validateAdminAccess(User user) {
        if (user.getRole() != User.Role.ADMIN) {
            throw new BusinessException("Bạn không có quyền thực hiện hành động này", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }
    }
}