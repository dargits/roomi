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
import roomi.dev.service.AuthService;
import roomi.dev.util.AuthUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthUtil authUtil;
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse response = authService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String sessionId) {
        authService.logout(sessionId);
        return ResponseEntity.ok(Map.of("mess", "Đăng xuất thành công"));
    }
    @PostMapping("/changepass")
    public ResponseEntity<?> changePassword(@RequestHeader("Authorization") String token,@Valid  @RequestBody PassRequest p) {
        User u= authUtil.getUserFromToken(token);
        BaseResponse r = authService.changePassword(u,p.getPassword());
        return ResponseEntity.ok(r);
    }

 
      
}
