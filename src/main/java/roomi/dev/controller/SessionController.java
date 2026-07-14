package roomi.dev.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.response.UserResponse;
import roomi.dev.entity.User;
import roomi.dev.service.SessionService;

@RestController
@RequestMapping("/api/session")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @GetMapping("/validate")
    public ResponseEntity<?> validateSession(@RequestHeader("Authorization") String sessionId) {
        if (sessionService.isValidSession(sessionId)) {
            return ResponseEntity.ok("Session hợp lệ");
        }
        return ResponseEntity.badRequest().body("Session không hợp lệ hoặc đã hết hạn");
    }


    @PostMapping("/cleanup")
    public ResponseEntity<String> cleanupExpiredSessions() {
        sessionService.cleanupExpiredSessions();
        return ResponseEntity.ok("Đã xóa các session hết hạn");
    }
}