package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.ChangePasswordRequest;
import plant.stay.dto.request.UserUpdateRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.UserResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.User;
import plant.stay.service.UserService;
import plant.stay.util.AuthUtil;
import plant.stay.model.Role;

@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin("*")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthUtil authUtil;

    // Lấy thông tin cá nhân
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMyProfile(HttpServletRequest request) {
        User currentUser = checkAuth(request);
        return ResponseEntity.ok(userService.getCurrentUserProfile(currentUser.getId()));
    }

    // Cập nhật thông tin cá nhân
    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMyProfile(
            @Valid @RequestBody UserUpdateRequest requestDto,
            HttpServletRequest request) {
        User currentUser = checkAuth(request);
        return ResponseEntity.ok(userService.updateProfile(currentUser.getId(), requestDto));
    }

    // Đổi mật khẩu
    @PutMapping("/me/password")
    public ResponseEntity<MessageResponse> changePassword(
            @Valid @RequestBody ChangePasswordRequest requestDto,
            HttpServletRequest request) {
        User currentUser = checkAuth(request);
        userService.changePassword(currentUser.getId(), requestDto);
        return ResponseEntity.ok(new MessageResponse("Đổi mật khẩu thành công"));
    }

    private User checkAuth(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập");
        }
        return user;
    }

    private User checkAdminOrOwner(HttpServletRequest request) {
        User user = checkAuth(request);
        if (user.getRole() != Role.ADMIN && user.getRole() != Role.OWNER) {
            throw new UnauthorizedException("Chỉ ADMIN hoặc OWNER mới có quyền thực hiện chức năng này");
        }
        return user;
    }

    // --- CÁC API DÀNH CHO ADMIN & OWNER QUẢN LÝ NHÂN SỰ ---

    @GetMapping
    public ResponseEntity<java.util.List<UserResponse>> getAllUsers(HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUserByAdmin(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest requestDto,
            HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(userService.updateUserByAdmin(id, requestDto));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<MessageResponse> changeRole(
            @PathVariable Long id,
            @RequestParam Role role,
            HttpServletRequest request) {
        User currentUser = checkAdminOrOwner(request);
        if (currentUser.getId().equals(id)) {
            throw new UnauthorizedException("Không thể tự thay đổi vai trò của chính mình");
        }
        userService.changeUserRole(id, role);
        return ResponseEntity.ok(new MessageResponse("Cập nhật vai trò thành công"));
    }

    @PutMapping("/{id}/lock")
    public ResponseEntity<MessageResponse> lockUser(
            @PathVariable Long id,
            HttpServletRequest request) {
        User currentUser = checkAdminOrOwner(request);
        if (currentUser.getId().equals(id)) {
            throw new UnauthorizedException("Không thể tự khóa tài khoản của chính mình");
        }
        userService.lockUser(id);
        return ResponseEntity.ok(new MessageResponse("Khóa tài khoản thành công"));
    }

    @PutMapping("/{id}/unlock")
    public ResponseEntity<MessageResponse> unlockUser(
            @PathVariable Long id,
            HttpServletRequest request) {
        User currentUser = checkAdminOrOwner(request);
        if (currentUser.getId().equals(id)) {
            throw new UnauthorizedException("Không thể tự mở khóa tài khoản của chính mình");
        }
        userService.unlockUser(id);
        return ResponseEntity.ok(new MessageResponse("Mở khóa tài khoản thành công"));
    }
}
