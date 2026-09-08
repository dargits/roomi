package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.GrantExtraPermissionRequest;
import plant.stay.dto.request.RevokeExtraPermissionRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.UserExtraPermissionDto;
import plant.stay.dto.response.UserPermissionOverviewResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.UserPermissionService;
import plant.stay.util.AuthUtil;

@RestController
@RequestMapping("/api/v1/admin/users/{userId}/permissions")
@RequiredArgsConstructor
@CrossOrigin("*")
public class UserPermissionController {

    private final UserPermissionService userPermissionService;
    private final AuthUtil authUtil;

    // Xem tổng quan phân quyền tài khoản (phân biệt quyền vai trò và quyền bổ sung)
    @GetMapping
    public ResponseEntity<UserPermissionOverviewResponse> getUserPermissions(
            @PathVariable Long userId,
            HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(userPermissionService.getUserPermissions(userId));
    }

    // Cấp thêm quyền xem có kiểm soát
    @PostMapping
    public ResponseEntity<UserExtraPermissionDto> grantPermission(
            @PathVariable Long userId,
            @Valid @RequestBody GrantExtraPermissionRequest req,
            HttpServletRequest request) {
        User admin = checkAdminOrOwner(request);
        return ResponseEntity.ok(userPermissionService.grantPermission(userId, req, admin));
    }

    // Thu hồi quyền xem bổ sung
    @DeleteMapping("/{permissionId}")
    public ResponseEntity<MessageResponse> revokePermission(
            @PathVariable Long userId,
            @PathVariable Long permissionId,
            @Valid @RequestBody(required = false) RevokeExtraPermissionRequest req,
            HttpServletRequest request) {
        User admin = checkAdminOrOwner(request);
        if (req == null) {
            req = new RevokeExtraPermissionRequest();
            req.setReason("Quản trị viên thu hồi thủ công");
        }
        userPermissionService.revokePermission(userId, permissionId, req, admin);
        return ResponseEntity.ok(new MessageResponse("Đã thu hồi quyền bổ sung thành công"));
    }

    private User checkAdminOrOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Vui lòng đăng nhập");
        if (user.getRole() != Role.ADMIN && user.getRole() != Role.OWNER) {
            throw new BusinessException("Chỉ Quản trị viên hoặc Chủ cơ sở mới có quyền quản lý phân quyền!", HttpStatus.FORBIDDEN);
        }
        return user;
    }
}
