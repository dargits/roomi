package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.ForceChangePasswordRequest;
import plant.stay.dto.request.ForgotPasswordRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.PasswordResetItemResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.PasswordResetService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@CrossOrigin("*")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;
    private final AuthUtil authUtil;

    // Yêu cầu cấp lại mật khẩu (Public)
    @PostMapping("/auth/forgot-password")
    public ResponseEntity<MessageResponse> requestReset(
            @Valid @RequestBody ForgotPasswordRequest req) {
        return ResponseEntity.ok(passwordResetService.requestPasswordReset(req));
    }

    // Đổi mật khẩu bắt buộc khi đăng nhập bằng mật khẩu tạm (Public)
    @PostMapping("/auth/force-change-password")
    public ResponseEntity<MessageResponse> forceChangePassword(
            @Valid @RequestBody ForceChangePasswordRequest req) {
        return ResponseEntity.ok(passwordResetService.forceChangePassword(req));
    }

    // Quản trị viên xem danh sách yêu cầu cấp lại mật khẩu
    @GetMapping("/admin/password-resets")
    public ResponseEntity<List<PasswordResetItemResponse>> getAllRequests(HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(passwordResetService.getAllRequests());
    }

    // Quản trị viên xem số lượng yêu cầu cấp lại mật khẩu đang chờ xử lý (PENDING)
    @GetMapping("/admin/password-resets/pending-count")
    public ResponseEntity<Long> getPendingCount(HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(passwordResetService.getPendingCount());
    }

    // Quản trị viên cấp mật khẩu tạm thời 24h
    @PostMapping("/admin/password-resets/{id}/issue")
    public ResponseEntity<PasswordResetItemResponse> issueTempPassword(
            @PathVariable Long id,
            HttpServletRequest request) {
        User adminActor = checkAdminOrOwner(request);
        return ResponseEntity.ok(passwordResetService.issueTempPassword(id, adminActor));
    }

    private User checkAdminOrOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Vui lòng đăng nhập");
        if (user.getRole() != Role.ADMIN && user.getRole() != Role.OWNER) {
            throw new BusinessException("Chỉ Quản trị viên hoặc Chủ cơ sở mới có quyền cấp lại mật khẩu!", HttpStatus.FORBIDDEN);
        }
        return user;
    }
}
