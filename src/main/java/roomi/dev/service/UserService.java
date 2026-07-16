package roomi.dev.service;

import roomi.dev.model.User;

import java.util.List;

public interface UserService {
    List<User> getAllUsers();
    User changeUserRole(Long id, User.Role role);
}
