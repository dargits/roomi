package roomi.dev.service;

import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.UserResponse;
import roomi.dev.model.User;

import java.util.List;

public interface UserService {
    List<UserResponse> getAllUsers();
    UserResponse changeUserRole(Long id, User.Role role);
    BaseResponse<UserResponse> lockUser(Long userId, User currentUser);
    BaseResponse<UserResponse> unlockUser(Long userId, User currentUser);
}
