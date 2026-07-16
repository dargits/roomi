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
import roomi.dev.service.UserService;
import roomi.dev.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final AuthUtil authUtil;
    private final UserService userService;

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

    @GetMapping("/users")
    public ResponseEntity<BaseResponse<List<UserResponse>>> getAllUsers(@RequestHeader("Authorization") String token) {
        User currentUser = authUtil.getUserFromToken(token);
        validateAdminAccess(currentUser);

        return ResponseEntity.ok(BaseResponse.<List<UserResponse>>builder()
                .mess("Thành công")
                .data(userService.getAllUsers())
                .build());
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<BaseResponse<UserResponse>> changeUserRole(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody ChangeRoleRequest request) {

        User currentUser = authUtil.getUserFromToken(token);
        validateAdminAccess(currentUser);

        User.Role newRole = User.Role.valueOf(request.getRole().trim().toUpperCase());
        UserResponse updatedUser = userService.changeUserRole(id, newRole);

        return ResponseEntity.ok(BaseResponse.<UserResponse>builder()
                .mess("Cập nhật quyền thành công")
                .data(updatedUser)
                .build());
    }

    private void validateAdminAccess(User user) {
        if (user.getRole() != User.Role.ADMIN) {
            throw new BusinessException("Bạn không có quyền thực hiện hành động này", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }
    }
}
