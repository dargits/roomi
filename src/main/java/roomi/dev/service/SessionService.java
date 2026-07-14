package roomi.dev.service;

import roomi.dev.entity.Session;
import roomi.dev.entity.User;

import java.util.Optional;

public interface SessionService {
    boolean isValidSession(String sessionId);
    Optional<User> getUserBySession(String sessionId);
    void cleanupExpiredSessions();
}