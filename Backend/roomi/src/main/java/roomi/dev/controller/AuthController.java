package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.LoginRequest;
import roomi.dev.dto.request.PassRequest;
import roomi.dev.dto.request.RegisterRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.LoginResponse;
import roomi.dev.dto.response.RegisterResponse;
import roomi.dev.model.User;
import roomi.dev.service.ActivityLogService;
import roomi.dev.service.AuthService;
import roomi.dev.util.AuthUtil;

import java.util.Map;

/**
 * Controller xác thực — đăng nhập, đăng ký, đăng xuất và đổi mật khẩu.
 *
 * Base URL: /api/v1/auth
 *
 * Cơ chế auth: session-based (UUID token lưu trong DB, hết hạn sau 24 giờ).
 * Token được gửi qua header Authorization — không có prefix "Bearer ".
 *
 * Endpoints:
 *   POST /api/v1/auth/register    — đăng ký tài khoản (admin tạo cho nhân viên)
 *   POST /api/v1/auth/login       — đăng nhập, trả về token
 *   POST /api/v1/auth/logout      — đăng xuất, vô hiệu hóa token
 *   POST /api/v1/auth/changepass  — đổi mật khẩu cá nhân
 */
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthUtil           authUtil;
    private final AuthService        authService;
    private final ActivityLogService activityLogService;

    /**
     * Đăng ký tài khoản mới (NCL-01 — §1.1 bước 3, 4).
     * Default role sau khi tạo: RECEPTIONIST. Admin có thể thay đổi sau qua /users/role/{id}.
     * Không yêu cầu đăng nhập (admin chạy lần đầu thiết lập).
     *
     * Đồng thời tạo session và trả về token để admin có thể dùng ngay.
     *
     * Ví dụ: POST /api/v1/auth/register
     * Body: { "fullName": "Nguyễn Lễ Tân", "username": "letan01",
     *         "password": "abc123", "phone": "0901..." }
     */
    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody RegisterRequest request) {

        authUtil.requireRoles(token, User.Role.ADMIN);
        User adminUser = authUtil.getUserFromToken(token);

        RegisterResponse response = authService.register(request);

        activityLogService.log(adminUser, "TẠO TÀI KHOẢN", "USER", null,
                "Tạo tài khoản nhân viên mới: " + request.getUsername() + " (" + request.getFullName() + ")");

        return ResponseEntity.ok(response);
    }

    /**
     * Đăng nhập vào hệ thống — trả về session token và role.
     * Token hạn sau 24 giờ; không đồng thời nhiều session cho cùng user.
     *
     * Ví dụ: POST /api/v1/auth/login
     * Body: { "username": "letan01", "password": "abc123" }
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Đăng xuất — vô hiệu hóa session token hiện tại.
     * Token bị xóa khỏi DB ngay lập tức.
     * Yêu cầu: header Authorization chứa token hợp lệ.
     *
     * Ví dụ: POST /api/v1/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String sessionId) {
        authService.logout(sessionId);
        return ResponseEntity.ok(Map.of("mess", "Đăng xuất thành công"));
    }

    /**
     * Đổi mật khẩu cá nhân (NCL-01 — CN-004).
     * Yêu cầu: token hợp lệ (bất kỳ role nào).
     *
     * Ví dụ: POST /api/v1/auth/changepass
     * Body: { "password": "mậtKhẩuMới" }
     */
    @PostMapping("/changepass")
    public ResponseEntity<?> changePassword(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody PassRequest p) {
        User u = authUtil.getUserFromToken(token);
        BaseResponse r = authService.changePassword(u, p.getPassword());
        return ResponseEntity.ok(r);
    }
}
