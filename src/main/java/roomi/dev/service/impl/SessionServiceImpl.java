package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.entity.User;
import roomi.dev.repository.SessionRepository;
import roomi.dev.service.SessionService;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;

    @Override
    public boolean isValidSession(String sessionId) {
        return sessionRepository.findValidSession(sessionId, LocalDateTime.now()).isPresent();
    }

    @Override
    public Optional<User> getUserBySession(String sessionId) {
        return sessionRepository.findValidSession(sessionId, LocalDateTime.now())
                .map(session -> session.getUser());
    }

    @Override
    public void cleanupExpiredSessions() {
        sessionRepository.deleteByExpiresAtBefore(LocalDateTime.now());
    }
}