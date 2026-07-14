package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.contains.AppContains;
import roomi.dev.dto.request.LoginRequest;
import roomi.dev.dto.request.RegisterRequest;
import roomi.dev.dto.response.AuthResponse;
import roomi.dev.dto.response.UserResponse;
import roomi.dev.entity.Role;
import roomi.dev.entity.Session;
import roomi.dev.entity.User;
import roomi.dev.repository.RoleRepository;
import roomi.dev.repository.SessionRepository;
import roomi.dev.repository.UserRepository;
import roomi.dev.service.AuthService;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final RoleRepository roleRepository;

    @Override
    public AuthResponse register(RegisterRequest request) {
        // Kiểm tra tài khoản đã tồn tại
        if (userRepository.existsByAccount(request.getAccount())) {
            throw new RuntimeException("Tài khoản đã tồn tại");
        }
        
        // Kiểm tra email đã tồn tại
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại");
        }

        // Tìm role USER, nếu không có thì tạo mới
        Role userRole = roleRepository.findByRoleName("USER")
                .orElseGet(() -> {
                    Role newRole = Role.builder()
                            .roleName("USER")
                            .build();
                    return roleRepository.save(newRole);
                });

        // Tạo user mới
        User user = User.builder()
                .userName(request.getUserName())
                .account(request.getAccount())
                .password(request.getPassword()) // Trong thực tế nên encode password
                .email(request.getEmail())
                .phone(request.getPhone())
                .avatarUrl(request.getAvatarUrl())
                .role(userRole)
                .build();

        user = userRepository.save(user);

        // Tạo session với thời gian
        String sessionId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusSeconds(AppContains.SESSION_TTL / 1000);
        
        Session session = Session.builder()
                .session(sessionId)
                .createdAt(now)
                .expiresAt(expiresAt)
                .user(user)
                .build();
        sessionRepository.save(session);

        UserResponse userResponse = UserResponse.builder()
                .id(user.getId())
                .userName(user.getUserName())
                .account(user.getAccount())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .roleName(user.getRole().getRoleName())
                .build();

        return AuthResponse.builder()
                .message("Đăng ký thành công")
                .sessionId(sessionId)
                .user(userResponse)
                .build();
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        // Tìm user theo account
        User user = userRepository.findByAccount(request.getAccount())
                .orElseThrow(() -> new RuntimeException("Tài khoản hoặc mật khẩu không đúng"));

        // Kiểm tra password (trong thực tế nên so sánh với encoded password)
        if (!user.getPassword().equals(request.getPassword())) {
            throw new RuntimeException("Tài khoản hoặc mật khẩu không đúng");
        }

        // Xóa session cũ nếu có
        sessionRepository.findByUserId(user.getId())
                .ifPresent(sessionRepository::delete);

        // Tạo session mới với thời gian
        String sessionId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusSeconds(AppContains.SESSION_TTL / 1000);
        
        Session session = Session.builder()
                .session(sessionId)
                .createdAt(now)
                .expiresAt(expiresAt)
                .user(user)
                .build();
        sessionRepository.save(session);

        UserResponse userResponse = UserResponse.builder()
                .id(user.getId())
                .userName(user.getUserName())
                .account(user.getAccount())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .roleName(user.getRole().getRoleName())
                .build();

        return AuthResponse.builder()
                .message("Đăng nhập thành công")
                .sessionId(sessionId)
                .user(userResponse)
                .build();
    }

    @Override
    public void logout(String sessionId) {
        sessionRepository.findBySession(sessionId)
                .ifPresent(sessionRepository::delete);
    }
}