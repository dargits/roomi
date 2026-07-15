package roomi.dev.service;

import roomi.dev.dto.request.LoginRequest;
import roomi.dev.dto.request.RegisterRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.LoginResponse;
import roomi.dev.dto.response.RegisterResponse;
import roomi.dev.model.User;

public interface AuthService {
    RegisterResponse register(RegisterRequest request);
    LoginResponse login(LoginRequest request);
    void logout(String token);
    BaseResponse changePassword(User u,String newPassword) ;

}