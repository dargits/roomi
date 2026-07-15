package roomi.dev.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.model.User;
import roomi.dev.util.AuthUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final AuthUtil authUtil;

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
                        "role", user.getRole()
                )
        ));
    }
}