package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.LoginRequest;
import roomi.dev.dto.request.RegisterRequest;
import roomi.dev.dto.response.AuthResponse;
import roomi.dev.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(AuthResponse.builder()
                            .message(e.getMessage())
                            .build());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(AuthResponse.builder()
                            .message(e.getMessage())
                            .build());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestHeader("Authorization") String sessionId) {
        try {
            authService.logout(sessionId);
            return ResponseEntity.ok("Đăng xuất thành công");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi đăng xuất");
        }
    }
}