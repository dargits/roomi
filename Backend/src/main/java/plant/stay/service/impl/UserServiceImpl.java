package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import plant.stay.dto.request.LoginRequest;
import plant.stay.dto.request.RegisterRequest;
import plant.stay.dto.response.LoginResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.UserResponse;
import plant.stay.dto.request.UserUpdateRequest;
import plant.stay.dto.request.ChangePasswordRequest;
import plant.stay.exception.DuplicateResourceException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.Session;
import plant.stay.model.User;
import plant.stay.repository.SessionRepository;
import plant.stay.repository.UserRepository;
import plant.stay.util.HashUtil;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements plant.stay.service.UserService {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;

    @Override
    public MessageResponse register(RegisterRequest request) {
        if (userRepository.existsByAccount(request.getAccount())) {
            throw new DuplicateResourceException("Tài khoản đã tồn tại");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email đã tồn tại");
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new DuplicateResourceException("Số điện thoại đã tồn tại");
        }

        User user = User.builder()
                .account(request.getAccount())
                .name(request.getName())
                .password(HashUtil.hashPassword(request.getPassword()))
                .email(request.getEmail())
                .phone(request.getPhone())
                .avatarImage(request.getAvatarImage())
                .role(request.getRole())
                .active(true)
                .build();

        userRepository.save(user);

        return new MessageResponse("Đăng ký tài khoản thành công");
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByAccount(request.getAccount())
                .orElseThrow(() -> new UnauthorizedException("Tài khoản hoặc mật khẩu không chính xác"));

        if (!HashUtil.checkPassword(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Tài khoản hoặc mật khẩu không chính xác");
        }

        if (!user.isActive()) {
            throw new UnauthorizedException("Tài khoản đã bị khóa");
        }

        String token = UUID.randomUUID().toString();

        Session session = sessionRepository.findByUser(user).orElse(new Session());
        session.setSession(token);
        session.setUser(user);
        sessionRepository.save(session);

        UserResponse userResponse = UserResponse.builder()
                .name(user.getName())
                .account(user.getAccount())
                .phone(user.getPhone())
                .email(user.getEmail())
                .createAt(user.getCreateAt())
                .avatarImage(user.getAvatarImage())
                .active(user.isActive())
                .role(user.getRole())
                .build();

        return new LoginResponse(token, userResponse);
    }

    @Override
    public UserResponse getCurrentUserProfile(Long userId) {
        User user = getUserById(userId);
        return mapToResponse(user);
    }

    @Override
    public UserResponse updateProfile(Long userId, UserUpdateRequest request) {
        User user = getUserById(userId);

        if (request.getEmail() != null && !request.getEmail().isEmpty() && userRepository.existsByEmailAndIdNot(request.getEmail(), userId)) {
            throw new DuplicateResourceException("Email đã được sử dụng bởi tài khoản khác");
        }
        if (request.getPhone() != null && !request.getPhone().isEmpty() && userRepository.existsByPhoneAndIdNot(request.getPhone(), userId)) {
            throw new DuplicateResourceException("Số điện thoại đã được sử dụng bởi tài khoản khác");
        }

        user.setName(request.getName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setAvatarImage(request.getAvatarImage());

        user = userRepository.save(user);
        return mapToResponse(user);
    }

    @Override
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = getUserById(userId);
        
        if (!HashUtil.checkPassword(request.getOldPassword(), user.getPassword())) {
            throw new UnauthorizedException("Mật khẩu cũ không chính xác");
        }
        
        user.setPassword(HashUtil.hashPassword(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public java.util.List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public UserResponse updateUserByAdmin(Long id, UserUpdateRequest request) {
        User user = getUserById(id);

        if (request.getEmail() != null && !request.getEmail().isEmpty() && userRepository.existsByEmailAndIdNot(request.getEmail(), id)) {
            throw new DuplicateResourceException("Email đã được sử dụng bởi tài khoản khác");
        }
        if (request.getPhone() != null && !request.getPhone().isEmpty() && userRepository.existsByPhoneAndIdNot(request.getPhone(), id)) {
            throw new DuplicateResourceException("Số điện thoại đã được sử dụng bởi tài khoản khác");
        }

        user.setName(request.getName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setAvatarImage(request.getAvatarImage());

        user = userRepository.save(user);
        return mapToResponse(user);
    }

    @Override
    public void changeUserRole(Long id, Role role) {
        User user = getUserById(id);
        user.setRole(role);
        userRepository.save(user);
    }

    @Override
    public void lockUser(Long id) {
        User user = getUserById(id);
        user.setActive(false);
        userRepository.save(user);
    }

    @Override
    public void unlockUser(Long id) {
        User user = getUserById(id);
        user.setActive(true);
        userRepository.save(user);
    }

    private User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
    }

    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .account(user.getAccount())
                .name(user.getName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .avatarImage(user.getAvatarImage())
                .role(user.getRole())
                .active(user.isActive())
                .createAt(user.getCreateAt())
                .build();
    }
}
