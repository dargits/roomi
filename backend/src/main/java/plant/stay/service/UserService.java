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
    /** Lấy danh sách nhân viên buồng phòng (HOUSEKEEPER) đang hoạt động để phân công dọn phòng */
    java.util.List<UserResponse> getHousekeepers();
    UserResponse updateUserByAdmin(Long id, UserUpdateRequest request);
    void changeUserRole(Long id, plant.stay.model.Role role);
    void lockUser(Long id);
    void unlockUser(Long id);

    // --- NCL-10-CN-007: Quản lý phiên đăng nhập và buộc đăng xuất từ xa ---
    LoginResponse login(LoginRequest request, jakarta.servlet.http.HttpServletRequest httpRequest);
    void logout(String token);
    java.util.List<plant.stay.dto.response.UserSessionResponse> getActiveSessions(String search, plant.stay.model.User currentUser, String currentToken);
    void forceLogoutSession(Long sessionId, String reason, plant.stay.model.User actor, String currentToken);
    void forceLogoutAllUserSessions(Long userId, String reason, plant.stay.model.User actor, String currentToken);
}
