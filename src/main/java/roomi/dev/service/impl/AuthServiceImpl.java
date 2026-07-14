package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.contains.AppContains;
import roomi.dev.dto.request.LoginRequest;
import roomi.dev.dto.request.RegisterRequest;
import roomi.dev.entity.Role;
import roomi.dev.entity.Session;
import roomi.dev.entity.User;
import roomi.dev.repository.RoleRepository;
import roomi.dev.repository.SessionRepository;
import roomi.dev.repository.UserRepository;
import roomi.dev.service.AuthService;
import roomi.dev.util.PasswordUtil;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final RoleRepository roleRepository;

    @Override
    public String register(RegisterRequest request) {
        if (userRepository.existsByAccount(request.getAccount())) {
            throw new RuntimeException("Tài khoản đã tồn tại");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại");
        }

        Role userRole = roleRepository.findByRoleName("USER")
                .orElseGet(() -> roleRepository.save(Role.builder().roleName("USER").build()));

        User user = User.builder()
                .userName(request.getUserName())
                .account(request.getAccount())
                .password(PasswordUtil.hashPassword(request.getPassword()))
                .email(request.getEmail())
                .phone(request.getPhone())
                .avatarUrl(request.getAvatarUrl())
                .role(userRole)
                .build();

        user = userRepository.save(user);
        return createSession(user);
    }

    @Override
    public String login(LoginRequest request) {
        User user = userRepository.findByAccount(request.getAccount())
                .orElseThrow(() -> new RuntimeException("Tài khoản hoặc mật khẩu không đúng"));

        if (!PasswordUtil.verifyPassword(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Tài khoản hoặc mật khẩu không đúng");
        }

        sessionRepository.findByUserId(user.getId()).ifPresent(sessionRepository::delete);
        return createSession(user);
    }

    @Override
    public void logout(String sessionId) {
        sessionRepository.findBySession(sessionId).ifPresent(sessionRepository::delete);
    }

    private String createSession(User user) {
        String sessionId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();

        Session session = Session.builder()
                .session(sessionId)
                .createdAt(now)
                .expiresAt(now.plusSeconds(AppContains.SESSION_TTL / 1000))
                .user(user)
                .build();

        sessionRepository.save(session);
        return sessionId;
    }
}