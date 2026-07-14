package roomi.dev.service;

import roomi.dev.dto.request.LoginRequest;
import roomi.dev.dto.request.RegisterRequest;

public interface AuthService {
    String register(RegisterRequest request);
    String login(LoginRequest request);
    void logout(String sessionId);
}