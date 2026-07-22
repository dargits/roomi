package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.UserResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.User;
import roomi.dev.repository.UserRepository;
import roomi.dev.service.UserService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponse changeUserRole(Long id, User.Role role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Người dùng không tồn tại", ErrorCode.USER_NOT_FOUND));

        user.setRole(role);
        return toUserResponse(userRepository.save(user));
    }

    @Override
    public BaseResponse<UserResponse> lockUser(Long userId, User currentUser) {
        // Kiểm tra quyền admin
        if (currentUser.getRole() != User.Role.ADMIN) {
            throw new BusinessException("Bạn không có quyền thực hiện hành động này", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Người dùng không tồn tại", ErrorCode.USER_NOT_FOUND));

        // Admin không thể khóa admin khác
        if (targetUser.getRole() == User.Role.ADMIN) {
            throw new BusinessException("Không thể khóa tài khoản admin", ErrorCode.CANNOT_LOCK_ADMIN);
        }

        // Kiểm tra đã bị khóa chưa
        if (!targetUser.getActive()) {
            throw new BusinessException("Tài khoản đã bị khóa", ErrorCode.USER_ALREADY_LOCKED);
        }

        targetUser.setActive(false);
        userRepository.save(targetUser);

        return BaseResponse.<UserResponse>builder()
                .mess("Khóa tài khoản thành công")
                .data(toUserResponse(targetUser))
                .build();
    }

    @Override
    public BaseResponse<UserResponse> unlockUser(Long userId, User currentUser) {
        // Kiểm tra quyền admin
        if (currentUser.getRole() != User.Role.ADMIN) {
            throw new BusinessException("Bạn không có quyền thực hiện hành động này", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Người dùng không tồn tại", ErrorCode.USER_NOT_FOUND));

        // Kiểm tra đã được mở khóa chưa
        if (targetUser.getActive()) {
            throw new BusinessException("Tài khoản đã được mở khóa", ErrorCode.USER_ALREADY_ACTIVE);
        }

        targetUser.setActive(true);
        userRepository.save(targetUser);

        return BaseResponse.<UserResponse>builder()
                .mess("Mở khóa tài khoản thành công")
                .data(toUserResponse(targetUser))
                .build();
    }
    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .role(user.getRole().name())
                .phone(user.getPhone())
                .active(user.getActive())
                .createdAt(user.getCreatedAt())
                .build();
    }

}

