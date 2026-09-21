package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import plant.stay.dto.request.LoginRequest;
import plant.stay.dto.request.RegisterRequest;
import plant.stay.dto.response.LoginResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.UserResponse;
import plant.stay.dto.request.UserUpdateRequest;
import plant.stay.dto.request.ChangePasswordRequest;
import plant.stay.exception.DuplicateResourceException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.Session;
import plant.stay.model.User;
import plant.stay.repository.SessionRepository;
import plant.stay.repository.UserRepository;
import plant.stay.util.HashUtil;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements plant.stay.service.UserService {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final plant.stay.repository.UserExtraPermissionRepository userExtraPermissionRepository;
    private final plant.stay.service.AuditLogService auditLogService;
    private final plant.stay.util.AuthUtil authUtil;

    @Override
    public MessageResponse register(RegisterRequest request) {
        if (userRepository.existsByAccount(request.getAccount())) {
            throw new DuplicateResourceException("Tài khoản đã tồn tại");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email đã tồn tại");
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new DuplicateResourceException("Số điện thoại đã tồn tại");
        }

        User user = User.builder()
                .account(request.getAccount())
                .name(request.getName())
                .password(HashUtil.hashPassword(request.getPassword()))
                .email(request.getEmail())
                .phone(request.getPhone())
                .avatarImage(request.getAvatarImage())
                .role(request.getRole())
                .active(true)
                .build();

        userRepository.save(user);

        return new MessageResponse("Đăng ký tài khoản thành công");
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        return login(request, null);
    }

    @Override
    public LoginResponse login(LoginRequest request, jakarta.servlet.http.HttpServletRequest httpRequest) {
        User user = userRepository.findByAccount(request.getAccount())
                .orElseThrow(() -> new UnauthorizedException("Tài khoản hoặc mật khẩu không chính xác"));

        if (!HashUtil.checkPassword(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Tài khoản hoặc mật khẩu không chính xác");
        }

        if (!user.isActive()) {
            throw new UnauthorizedException("Tài khoản đã bị khóa");
        }

        String token = UUID.randomUUID().toString();
        String ip = plant.stay.util.AuthUtil.extractClientIp(httpRequest);
        String userAgent = httpRequest != null ? httpRequest.getHeader("User-Agent") : null;
        String deviceInfo = plant.stay.util.AuthUtil.parseDeviceInfo(userAgent);

        // Kiểm tra cấu hình giới hạn số phiên đăng nhập đồng thời (Max Concurrent Sessions)
        int maxSessions = authUtil != null ? authUtil.getMaxConcurrentSessions() : 0;
        if (maxSessions > 0) {
            List<Session> activeSessions = sessionRepository.findByUserIdAndStatus(user.getId(), "ACTIVE");
            if (activeSessions.size() >= maxSessions) {
                // Sắp xếp các phiên cũ nhất theo thời điểm hoạt động gần nhất để thu hồi trước
                activeSessions.sort((s1, s2) -> {
                    java.time.LocalDateTime t1 = s1.getLastActiveAt() != null ? s1.getLastActiveAt() : s1.getCreateAt();
                    java.time.LocalDateTime t2 = s2.getLastActiveAt() != null ? s2.getLastActiveAt() : s2.getCreateAt();
                    if (t1 == null) return -1;
                    if (t2 == null) return 1;
                    return t1.compareTo(t2);
                });
                int toRevoke = activeSessions.size() - maxSessions + 1;
                for (int i = 0; i < toRevoke && i < activeSessions.size(); i++) {
                    Session oldSession = activeSessions.get(i);
                    oldSession.setStatus("REVOKED");
                    String revokeReason = (maxSessions == 1)
                            ? "Phiên làm việc đã bị kết thúc do tài khoản vừa đăng nhập trên thiết bị khác."
                            : "Phiên làm việc đã bị kết thúc do tài khoản vượt quá giới hạn " + maxSessions + " phiên đăng nhập đồng thời.";
                    oldSession.setRevokedReason(revokeReason);
                    oldSession.setRevokedAt(java.time.LocalDateTime.now());
                    sessionRepository.save(oldSession);
                }
            }
        }

        // NCL-10-CN-007: Tạo bản ghi phiên mới với thông tin thiết bị và thời điểm thao tác
        Session session = Session.builder()
                .session(token)
                .user(user)
                .ipAddress(ip)
                .userAgent(userAgent)
                .deviceInfo(deviceInfo)
                .status("ACTIVE")
                .createAt(java.time.LocalDateTime.now())
                .lastActiveAt(java.time.LocalDateTime.now())
                .build();
        sessionRepository.save(session);

        UserResponse userResponse = UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .account(user.getAccount())
                .phone(user.getPhone())
                .email(user.getEmail())
                .createAt(user.getCreateAt())
                .avatarImage(user.getAvatarImage())
                .active(user.isActive())
                .mustChangePassword(user.isMustChangePassword())
                .role(user.getRole())
                .build();

        return new LoginResponse(token, userResponse);
    }

    @Override
    public UserResponse getCurrentUserProfile(Long userId) {
        User user = getUserById(userId);
        return mapToResponse(user);
    }

    @Override
    public UserResponse updateProfile(Long userId, UserUpdateRequest request) {
        User user = getUserById(userId);

        if (request.getEmail() != null && !request.getEmail().isEmpty() && userRepository.existsByEmailAndIdNot(request.getEmail(), userId)) {
            throw new DuplicateResourceException("Email đã được sử dụng bởi tài khoản khác");
        }
        if (request.getPhone() != null && !request.getPhone().isEmpty() && userRepository.existsByPhoneAndIdNot(request.getPhone(), userId)) {
            throw new DuplicateResourceException("Số điện thoại đã được sử dụng bởi tài khoản khác");
        }

        user.setName(request.getName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setAvatarImage(request.getAvatarImage());

        user = userRepository.save(user);
        return mapToResponse(user);
    }

    @Override
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = getUserById(userId);
        
        if (!HashUtil.checkPassword(request.getOldPassword(), user.getPassword())) {
            throw new UnauthorizedException("Mật khẩu cũ không chính xác");
        }
        
        user.setPassword(HashUtil.hashPassword(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public java.util.List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public java.util.List<UserResponse> getHousekeepers() {
        // Chỉ lấy tài khoản có vai trò HOUSEKEEPER đang hoạt động (active = true)
        return userRepository.findByRoleAndActiveTrue(Role.HOUSEKEEPER).stream()
                .map(this::mapToResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public UserResponse updateUserByAdmin(Long id, UserUpdateRequest request) {
        User user = getUserById(id);

        if (request.getEmail() != null && !request.getEmail().isEmpty() && userRepository.existsByEmailAndIdNot(request.getEmail(), id)) {
            throw new DuplicateResourceException("Email đã được sử dụng bởi tài khoản khác");
        }
        if (request.getPhone() != null && !request.getPhone().isEmpty() && userRepository.existsByPhoneAndIdNot(request.getPhone(), id)) {
            throw new DuplicateResourceException("Số điện thoại đã được sử dụng bởi tài khoản khác");
        }

        user.setName(request.getName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setAvatarImage(request.getAvatarImage());

        user = userRepository.save(user);
        return mapToResponse(user);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void changeUserRole(Long id, Role role) {
        User user = getUserById(id);
        if (user.getRole() != role) {
            user.setRole(role);
            userRepository.save(user);

            // Thu hồi toàn bộ quyền bổ sung cũ khi đổi vai trò (NCL-01-CN-006)
            java.util.List<plant.stay.model.UserExtraPermission> activePerms = 
                    userExtraPermissionRepository.findByUserIdAndIsRevokedFalse(id);
            for (plant.stay.model.UserExtraPermission p : activePerms) {
                p.setIsRevoked(true);
                p.setRevokedAt(java.time.LocalDateTime.now());
                p.setRevokeReason("Tự động thu hồi do thay đổi vai trò tài khoản sang " + role + " để tránh tích tụ quyền");
                userExtraPermissionRepository.save(p);
            }

            // NCL-10-CN-007 (TC-03): Khi một tài khoản bị đổi vai trò, mọi phiên đang mở phải bị kết thúc để quyền cũ không còn hiệu lực
            java.util.List<Session> activeSessions = sessionRepository.findByUserIdAndStatus(id, "ACTIVE");
            for (Session s : activeSessions) {
                s.setStatus("REVOKED");
                s.setRevokedReason("Vai trò tài khoản đã thay đổi thành " + role + ". Vui lòng đăng nhập lại để cập nhật quyền.");
                s.setRevokedAt(java.time.LocalDateTime.now());
                sessionRepository.save(s);
            }
        }
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void lockUser(Long id) {
        User user = getUserById(id);
        user.setActive(false);
        userRepository.save(user);

        // NCL-10-CN-007 (TC-03): Khi một tài khoản bị khóa, mọi phiên đang mở của tài khoản đó phải bị kết thúc
        java.util.List<Session> activeSessions = sessionRepository.findByUserIdAndStatus(id, "ACTIVE");
        for (Session s : activeSessions) {
            s.setStatus("REVOKED");
            s.setRevokedReason("Tài khoản đã bị khóa bởi Quản trị viên.");
            s.setRevokedAt(java.time.LocalDateTime.now());
            sessionRepository.save(s);
        }
    }

    @Override
    public void unlockUser(Long id) {
        User user = getUserById(id);
        user.setActive(true);
        userRepository.save(user);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void logout(String token) {
        if (token == null || token.trim().isEmpty()) return;
        sessionRepository.findBySession(token).ifPresent(s -> {
            s.setStatus("REVOKED");
            s.setRevokedReason("Người dùng tự đăng xuất.");
            s.setRevokedAt(java.time.LocalDateTime.now());
            sessionRepository.save(s);
        });
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public java.util.List<plant.stay.dto.response.UserSessionResponse> getActiveSessions(
            String search, User currentUser, String currentToken) {
        java.util.List<Session> sessions = sessionRepository.findByStatusOrderByLastActiveAtDesc("ACTIVE");
        int timeoutMinutes = authUtil != null ? authUtil.getSessionTimeoutMinutes() : 120;
        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        java.util.List<plant.stay.dto.response.UserSessionResponse> result = new java.util.ArrayList<>();
        for (Session s : sessions) {
            // Tự kết thúc phiên không thao tác quá khoảng thời gian do Chủ cơ sở cấu hình
            java.time.LocalDateTime lastActive = s.getLastActiveAt() != null ? s.getLastActiveAt() : s.getCreateAt();
            if (lastActive != null && lastActive.plusMinutes(timeoutMinutes).isBefore(now)) {
                s.setStatus("EXPIRED");
                s.setRevokedReason("Hết hạn do không thao tác quá " + timeoutMinutes + " phút");
                s.setRevokedAt(now);
                sessionRepository.save(s);
                continue;
            }

            User u = s.getUser();
            if (u == null) continue;

            if (search != null && !search.trim().isEmpty()) {
                String q = search.trim().toLowerCase();
                boolean matchAccount = u.getAccount() != null && u.getAccount().toLowerCase().contains(q);
                boolean matchName = u.getName() != null && u.getName().toLowerCase().contains(q);
                boolean matchRole = u.getRole() != null && u.getRole().name().toLowerCase().contains(q);
                if (!matchAccount && !matchName && !matchRole) {
                    continue;
                }
            }

            boolean isCurrent = currentToken != null && currentToken.equals(s.getSession());

            result.add(plant.stay.dto.response.UserSessionResponse.builder()
                    .id(s.getId())
                    .userId(u.getId())
                    .account(u.getAccount())
                    .name(u.getName())
                    .role(u.getRole())
                    .loginAt(s.getCreateAt())
                    .lastActiveAt(s.getLastActiveAt() != null ? s.getLastActiveAt() : s.getCreateAt())
                    .ipAddress(s.getIpAddress() != null ? s.getIpAddress() : "127.0.0.1")
                    .deviceInfo(s.getDeviceInfo() != null ? s.getDeviceInfo() : "Không xác định")
                    .userAgent(s.getUserAgent())
                    .status(s.getStatus())
                    .isCurrentSession(isCurrent)
                    .build());
        }
        return result;
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void forceLogoutSession(Long sessionId, String reason, User actor, String currentToken) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiên đăng nhập"));

        // NCL-10-CN-007-TC-04: Quản trị viên không được buộc đăng xuất chính phiên của mình để tránh tự khóa mình ra ngoài
        if (currentToken != null && currentToken.equals(session.getSession())) {
            throw new plant.stay.exception.BusinessException("Không thể tự buộc đăng xuất chính phiên đang hoạt động của bạn để tránh tự khóa.");
        }

        String finalReason = (reason != null && !reason.trim().isEmpty())
                ? reason.trim()
                : "Quản trị viên đã kết thúc phiên đăng nhập này.";

        session.setStatus("REVOKED");
        session.setRevokedReason(finalReason);
        session.setRevokedAt(java.time.LocalDateTime.now());
        session.setRevokedBy(actor);
        sessionRepository.save(session);

        // QTN-10: Ghi nhật ký thao tác
        if (auditLogService != null) {
            String acc = session.getUser() != null ? session.getUser().getAccount() : "Unknown";
            auditLogService.log("SESSION", sessionId, "FORCE_LOGOUT", actor,
                    "Buộc đăng xuất phiên của tài khoản " + acc + ". Lý do: " + finalReason);
        }
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void forceLogoutAllUserSessions(Long userId, String reason, User actor, String currentToken) {
        User targetUser = getUserById(userId);

        // NCL-10-CN-007-TC-04: Quản trị viên không được buộc đăng xuất chính mình nếu tự chọn tài khoản mình
        if (actor != null && actor.getId().equals(userId)) {
            throw new plant.stay.exception.BusinessException("Không thể tự buộc đăng xuất toàn bộ phiên của chính mình để tránh tự khóa.");
        }

        String finalReason = (reason != null && !reason.trim().isEmpty())
                ? reason.trim()
                : "Quản trị viên đã kết thúc toàn bộ phiên của tài khoản này.";

        java.util.List<Session> activeSessions = sessionRepository.findByUserIdAndStatus(userId, "ACTIVE");
        int count = 0;
        for (Session s : activeSessions) {
            if (currentToken != null && currentToken.equals(s.getSession())) {
                continue;
            }
            s.setStatus("REVOKED");
            s.setRevokedReason(finalReason);
            s.setRevokedAt(java.time.LocalDateTime.now());
            s.setRevokedBy(actor);
            sessionRepository.save(s);
            count++;
        }

        // QTN-10: Ghi nhật ký thao tác
        if (auditLogService != null) {
            auditLogService.log("USER", userId, "FORCE_LOGOUT_ALL", actor,
                    "Buộc đăng xuất " + count + " phiên của tài khoản " + targetUser.getAccount() + ". Lý do: " + finalReason);
        }
    }

    private User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
    }

    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .account(user.getAccount())
                .name(user.getName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .avatarImage(user.getAvatarImage())
                .role(user.getRole())
                .active(user.isActive())
                .createAt(user.getCreateAt())
                .build();
    }
}
