package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.ChangeRoleRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.model.User;
import roomi.dev.service.UserService;
import roomi.dev.util.AuthUtil;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final AuthUtil authUtil;
    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String token) {
        User user = authUtil.getUserFromToken(token);

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "fullName", user.getFullName(),
                "username", user.getUsername(),
                "role", user.getRole().name(),
                "phone", user.getPhone()
        ));
    }

    @GetMapping("/info")
    public ResponseEntity<?> getUserInfo(@RequestHeader("Authorization") String token) {
        User user = authUtil.getUserFromToken(token);

        return ResponseEntity.ok(Map.of(
                "mess", "Thành công",
                "user", Map.of(
                        "id", user.getId(),
                        "name", user.getFullName(),
                        "role", user.getRole().name()
                )
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<BaseResponse<List<Map<String, Object>>>> getAllUsers(@RequestHeader("Authorization") String token) {
        User currentUser = authUtil.getUserFromToken(token);
        validateAdminAccess(currentUser);

        List<Map<String, Object>> users = userService.getAllUsers().stream()
                .map(user -> Map.<String, Object>of(
                        "id", user.getId(),
                        "fullName", user.getFullName(),
                        "username", user.getUsername(),
                        "role", user.getRole().name(),
                        "phone", user.getPhone(),
                        "active", user.getActive()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(BaseResponse.<List<Map<String, Object>>>builder()
                .mess("Thành công")
                .data(users)
                .build());
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<BaseResponse<Map<String, Object>>> changeUserRole(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody ChangeRoleRequest request) {

        User currentUser = authUtil.getUserFromToken(token);
        validateAdminAccess(currentUser);

        User.Role newRole = User.Role.valueOf(request.getRole().trim().toUpperCase());
        User updatedUser = userService.changeUserRole(id, newRole);

        return ResponseEntity.ok(BaseResponse.<Map<String, Object>>builder()
                .mess("Cập nhật quyền thành công")
                .data(Map.of("id", updatedUser.getId(), "role", updatedUser.getRole().name()))
                .build());
    }

    private void validateAdminAccess(User user) {
        if (user.getRole() != User.Role.ADMIN && user.getRole() != User.Role.OWNER) {
            throw new IllegalArgumentException("Bạn không có quyền thực hiện hành động này");
        }
    }
}