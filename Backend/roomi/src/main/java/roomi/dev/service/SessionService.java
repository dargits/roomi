package roomi.dev.service;

import roomi.dev.model.User;

import java.util.Optional;

public interface SessionService {
    boolean isValidSession(String token);
    Optional<User> getUserBySession(String token);
    void cleanupExpiredSessions();
}