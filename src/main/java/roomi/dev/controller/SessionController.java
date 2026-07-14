package roomi.dev.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.service.SessionService;

import java.util.Map;

@RestController
@RequestMapping("/api/session")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @GetMapping("/validate")
    public ResponseEntity<?> validateSession(@RequestHeader("Authorization") String sessionId) {
        boolean valid = sessionService.isValidSession(sessionId);
        return ResponseEntity.ok(Map.of("valid", valid));
    }
}