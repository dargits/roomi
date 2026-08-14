package plant.stay.service;

import plant.stay.dto.request.ChangePasswordRequest;
import plant.stay.dto.request.LoginRequest;
import plant.stay.dto.request.RegisterRequest;
import plant.stay.dto.request.UserUpdateRequest;
import plant.stay.dto.response.LoginResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.UserResponse;

public interface UserService {
    MessageResponse register(RegisterRequest request);
    LoginResponse login(LoginRequest request);
    UserResponse getCurrentUserProfile(Long userId);
    UserResponse updateProfile(Long userId, UserUpdateRequest request);
    void changePassword(Long userId, ChangePasswordRequest request);

    java.util.List<UserResponse> getAllUsers();
    UserResponse updateUserByAdmin(Long id, UserUpdateRequest request);
    void changeUserRole(Long id, plant.stay.model.Role role);
    void lockUser(Long id);
    void unlockUser(Long id);
}
