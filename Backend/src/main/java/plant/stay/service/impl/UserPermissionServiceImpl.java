package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.GrantExtraPermissionRequest;
import plant.stay.dto.request.RevokeExtraPermissionRequest;
import plant.stay.dto.response.UserExtraPermissionDto;
import plant.stay.dto.response.UserPermissionOverviewResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.model.UserExtraPermission;
import plant.stay.repository.UserExtraPermissionRepository;
import plant.stay.repository.UserRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.UserPermissionService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserPermissionServiceImpl implements UserPermissionService {

    private final UserExtraPermissionRepository userExtraPermissionRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    // Danh sách quyền xem được kiểm soát cho phép cấp thêm (Story NCL-01-CN-006)
    public static final Map<String, String> ALLOWED_VIEW_PERMISSIONS = new LinkedHashMap<>() {{
        put("VIEW_REVENUE_REPORT", "Xem báo cáo doanh thu tổng hợp");
        put("VIEW_OCCUPANCY_REPORT", "Xem báo cáo công suất phòng");
        put("VIEW_DEPOSITS", "Xem danh sách khoản tiền đặt cọc");
        put("VIEW_DEBTS", "Xem danh sách công nợ & theo dõi quá hạn");
        put("VIEW_STAY_DECLARATION", "Xem danh sách khai báo lưu trú");
    }};

    @Override
    @Transactional(readOnly = true)
    public UserPermissionOverviewResponse getUserPermissions(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng #" + userId));

        List<String> roleDefaults = getRoleDefaultPermissions(user.getRole());

        List<UserExtraPermission> extraList = userExtraPermissionRepository.findByUserId(userId);
        LocalDate today = LocalDate.now();

        List<UserExtraPermissionDto> dtos = extraList.stream()
                .map(p -> {
                    boolean isExpired = p.getExpiresAt() != null && p.getExpiresAt().isBefore(today);
                    return UserExtraPermissionDto.builder()
                            .id(p.getId())
                            .permission(p.getPermission())
                            .permissionLabel(ALLOWED_VIEW_PERMISSIONS.getOrDefault(p.getPermission(), p.getPermission()))
                            .expiresAt(p.getExpiresAt())
                            .reason(p.getReason())
                            .grantedByName(p.getGrantedBy() != null ? p.getGrantedBy().getName() : null)
                            .grantedAt(p.getGrantedAt())
                            .isExpired(isExpired)
                            .isRevoked(Boolean.TRUE.equals(p.getIsRevoked()))
                            .revokeReason(p.getRevokeReason())
                            .build();
                })
                .sorted(Comparator.comparing(UserExtraPermissionDto::getGrantedAt).reversed())
                .collect(Collectors.toList());

        return UserPermissionOverviewResponse.builder()
                .userId(user.getId())
                .userName(user.getName())
                .account(user.getAccount())
                .role(user.getRole())
                .roleDefaultPermissions(roleDefaults)
                .extraPermissions(dtos)
                .availableExtraPermissions(new ArrayList<>(ALLOWED_VIEW_PERMISSIONS.keySet()))
                .build();
    }

    @Override
    @Transactional
    public UserExtraPermissionDto grantPermission(Long userId, GrantExtraPermissionRequest req, User adminActor) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng #" + userId));

        String perm = req.getPermission();
        if (!ALLOWED_VIEW_PERMISSIONS.containsKey(perm)) {
            throw new IllegalArgumentException("Quyền '" + perm + "' không nằm trong danh sách quyền xem có kiểm soát được phép cấp thêm. " +
                    "Các quyền phê duyệt liên quan tới tiền tuyệt đối không được ủy quyền!");
        }

        // Kiểm tra xem quyền này đã có từ vai trò mặc định chưa
        if (getRoleDefaultPermissions(targetUser.getRole()).contains(perm)) {
            throw new IllegalArgumentException("Người dùng đã có quyền này từ vai trò mặc định (" + targetUser.getRole() + ")!");
        }

        LocalDate today = LocalDate.now();
        if (req.getExpiresAt() != null && req.getExpiresAt().isBefore(today)) {
            throw new IllegalArgumentException("Ngày hết hiệu lực phải từ hôm nay trở đi!");
        }

        // Kiểm tra xem đã có quyền bổ sung này đang active chưa
        Optional<UserExtraPermission> existing = userExtraPermissionRepository.findActivePermission(userId, perm, today);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Người dùng đã được cấp quyền này và hiện vẫn đang còn hiệu lực!");
        }

        UserExtraPermission extra = UserExtraPermission.builder()
                .user(targetUser)
                .permission(perm)
                .grantedBy(adminActor)
                .expiresAt(req.getExpiresAt())
                .reason(req.getReason())
                .isRevoked(false)
                .build();

        extra = userExtraPermissionRepository.save(extra);

        auditLogService.log("UserExtraPermission", extra.getId(), "GRANT_EXTRA_PERMISSION", adminActor,
                "Quản trị viên " + adminActor.getName() + " cấp quyền xem '" + ALLOWED_VIEW_PERMISSIONS.get(perm)
                + "' cho tài khoản " + targetUser.getAccount() + " (" + targetUser.getName() + ")"
                + (req.getExpiresAt() != null ? ", hạn đến " + req.getExpiresAt() : ", không thời hạn")
                + ", lý do: " + req.getReason());

        return UserExtraPermissionDto.builder()
                .id(extra.getId())
                .permission(extra.getPermission())
                .permissionLabel(ALLOWED_VIEW_PERMISSIONS.get(perm))
                .expiresAt(extra.getExpiresAt())
                .reason(extra.getReason())
                .grantedByName(adminActor.getName())
                .grantedAt(extra.getGrantedAt())
                .isExpired(false)
                .isRevoked(false)
                .build();
    }

    @Override
    @Transactional
    public void revokePermission(Long userId, Long permissionId, RevokeExtraPermissionRequest req, User adminActor) {
        UserExtraPermission extra = userExtraPermissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quyền bổ sung #" + permissionId));

        if (!extra.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Quyền này không thuộc về tài khoản #" + userId);
        }

        if (Boolean.TRUE.equals(extra.getIsRevoked())) {
            throw new IllegalArgumentException("Quyền này đã được thu hồi trước đó!");
        }

        extra.setIsRevoked(true);
        extra.setRevokedBy(adminActor);
        extra.setRevokedAt(LocalDateTime.now());
        extra.setRevokeReason(req.getReason());
        userExtraPermissionRepository.save(extra);

        auditLogService.log("UserExtraPermission", extra.getId(), "REVOKE_EXTRA_PERMISSION", adminActor,
                "Quản trị viên " + adminActor.getName() + " đã thu hồi quyền '" + ALLOWED_VIEW_PERMISSIONS.getOrDefault(extra.getPermission(), extra.getPermission())
                + "' của tài khoản " + extra.getUser().getAccount() + ", lý do: " + req.getReason());
    }

    @Override
    @Transactional
    public void revokeAllOnRoleChange(Long userId, User adminActor) {
        List<UserExtraPermission> activePerms = userExtraPermissionRepository.findByUserIdAndIsRevokedFalse(userId);
        if (!activePerms.isEmpty()) {
            for (UserExtraPermission p : activePerms) {
                p.setIsRevoked(true);
                p.setRevokedBy(adminActor);
                p.setRevokedAt(LocalDateTime.now());
                p.setRevokeReason("Tự động thu hồi do thay đổi vai trò tài khoản để tránh tích tụ quyền");
                userExtraPermissionRepository.save(p);
            }
            auditLogService.log("User", userId, "AUTO_REVOKE_PERMISSIONS_ON_ROLE_CHANGE", adminActor,
                    "Hệ thống đã tự động thu hồi " + activePerms.size() + " quyền xem bổ sung của người dùng #" + userId + " do thay đổi vai trò tài khoản.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasPermission(Long userId, String permission) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || !user.isActive()) return false;

        // Chủ cơ sở và Admin mặc định có toàn bộ quyền xem
        if (user.getRole() == Role.OWNER || user.getRole() == Role.ADMIN) {
            return true;
        }

        // Quyền theo vai trò
        if (getRoleDefaultPermissions(user.getRole()).contains(permission)) {
            return true;
        }

        // Quyền bổ sung còn hiệu lực
        return userExtraPermissionRepository.findActivePermission(userId, permission, LocalDate.now()).isPresent();
    }

    private List<String> getRoleDefaultPermissions(Role role) {
        if (role == null) return Collections.emptyList();
        switch (role) {
            case OWNER:
            case ADMIN:
                return new ArrayList<>(ALLOWED_VIEW_PERMISSIONS.keySet());
            case ACCOUNTANT:
                return List.of("VIEW_REVENUE_REPORT", "VIEW_DEPOSITS", "VIEW_DEBTS");
            case RECEPTIONIST:
                return List.of("VIEW_DEPOSITS", "VIEW_STAY_DECLARATION");
            case HOUSEKEEPER:
                return Collections.emptyList();
            default:
                return Collections.emptyList();
        }
    }
}
