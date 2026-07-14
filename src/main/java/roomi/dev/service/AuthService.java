package roomi.dev.service;

import roomi.dev.dto.request.LoginRequest;
import roomi.dev.dto.request.RegisterRequest;
import roomi.dev.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    void logout(String sessionId);
}