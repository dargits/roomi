package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.ChangeRoleRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.UserResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.User;
import roomi.dev.service.ActivityLogService;
import roomi.dev.service.AuthService;
import roomi.dev.service.UserService;
import roomi.dev.util.AuthUtil;

import java.util.List;

/**
 * Controller quản lý tài khoản người dùng và phân quyền — NCL-01 (§1.1, §4.2).
 *
 * Base URL: /api/v1/users
 *
 * Các chức năng:
 *   - Xem hồ sơ cá nhân (mọi user đã đăng nhập)
 *   - Xem danh sách nhân viên / thay đổi role / khóa-mở khóa (chỉ ADMIN)
 *
 * Phân quyền theo vai trò nghiệp vụ (VT-05):
 *   - Xem profile       : mọi role đã đăng nhập
 *   - Xem danh sách user: ADMIN
 *   - Thay đổi role     : ADMIN
 *   - Khóa / mở khóa   : ADMIN (không khóa được admin khác)
 *
 * Endpoints:
 *   GET /api/v1/users/profile     — hồ sơ cá nhân
 *   GET /api/v1/users/            — danh sách tất cả nhân viên (ADMIN)
 *   PUT /api/v1/users/role/{id}   — thay đổi role (ADMIN)
 *   PUT /api/v1/users/lock/{id}   — khóa tài khoản (ADMIN)
 *   PUT /api/v1/users/unlock/{id} — mở khóa tài khoản (ADMIN)
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final AuthUtil           authUtil;
    private final UserService        userService;
    private final AuthService        authService;
    private final ActivityLogService activityLogService;

    @GetMapping("/profile")
    public ResponseEntity<BaseResponse<UserResponse>> getProfile(@RequestHeader("Authorization") String token) {
        User user = authUtil.getUserFromToken(token);

        return ResponseEntity.ok(BaseResponse.<UserResponse>builder()
                .mess("Thành công")
                .data(UserResponse.builder()
                        .id(user.getId())
                        .fullName(user.getFullName())
                        .username(user.getUsername())
                        .role(user.getRole().name())
                        .phone(user.getPhone())
                        .active(user.getActive())
                        .createdAt(user.getCreatedAt())
                        .build())
                .build());
    }

    @GetMapping("/")
    public ResponseEntity<BaseResponse<List<UserResponse>>> getAllUsers(@RequestHeader("Authorization") String token) {
        User currentUser = authUtil.getUserFromToken(token);
        authService.validateAdminAccess(currentUser);

        return ResponseEntity.ok(BaseResponse.<List<UserResponse>>builder()
                .mess("Thành công")
                .data(userService.getAllUsers())
                .build());
    }

    @PutMapping("/role/{id}")
    public ResponseEntity<BaseResponse<UserResponse>> changeUserRole(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody ChangeRoleRequest request) {

        User currentUser = authUtil.getUserFromToken(token);
        authService.validateAdminAccess(currentUser);

        User.Role newRole = User.Role.valueOf(request.getRole().trim().toUpperCase());
        UserResponse updatedUser = userService.changeUserRole(id, newRole);

        activityLogService.log(currentUser, "ĐỔI VAI TRÒ", "USER", id,
                "Cập nhật vai trò nhân viên " + updatedUser.getUsername() + " sang " + updatedUser.getRole());

        return ResponseEntity.ok(BaseResponse.<UserResponse>builder()
                .mess("Cập nhật quyền thành công")
                .data(updatedUser)
                .build());
    }

    @PutMapping("/lock/{id}")
    public ResponseEntity<BaseResponse<UserResponse>> lockUser(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        User currentUser = authUtil.getUserFromToken(token);
        BaseResponse<UserResponse> response = userService.lockUser(id, currentUser);

        activityLogService.log(currentUser, "KHÓA TÀI KHOẢN", "USER", id,
                "Khóa tài khoản nhân viên ID #" + id);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/unlock/{id}")
    public ResponseEntity<BaseResponse<UserResponse>> unlockUser(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        User currentUser = authUtil.getUserFromToken(token);
        BaseResponse<UserResponse> response = userService.unlockUser(id, currentUser);

        activityLogService.log(currentUser, "MỞ KHÓA TÀI KHOẢN", "USER", id,
                "Mở khóa tài khoản nhân viên ID #" + id);

        return ResponseEntity.ok(response);
    }

}
