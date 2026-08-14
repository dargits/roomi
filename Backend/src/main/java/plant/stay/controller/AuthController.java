package plant.stay.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.LoginRequest;
import plant.stay.dto.request.RegisterRequest;
import plant.stay.dto.response.LoginResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.service.UserService;
import plant.stay.util.AuthUtil;
import plant.stay.model.User;
import plant.stay.model.Role;
import plant.stay.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@CrossOrigin("*")
public class AuthController {

    private final UserService userService;
    private final AuthUtil authUtil;

    @PostMapping("/register")
    public ResponseEntity<MessageResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        User currentUser = authUtil.getUserFromRequest(httpRequest);
        if (currentUser == null || (currentUser.getRole() != Role.OWNER && currentUser.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Chỉ ADMIN hoặc OWNER mới có quyền tạo tài khoản");
        }
        
        MessageResponse response = userService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = userService.login(request);
        return ResponseEntity.ok(response);
    }
}
