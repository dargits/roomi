package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.model.User;
import roomi.dev.repository.SessionRepository;
import roomi.dev.repository.UserRepository;
import roomi.dev.service.SessionService;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;

    @Override
    public boolean isValidSession(String token) {
        return sessionRepository.findValidToken(token, LocalDateTime.now()).isPresent();
    }

    @Override
    public Optional<User> getUserBySession(String token) {
        return sessionRepository.findValidToken(token, LocalDateTime.now())
                .flatMap(session -> userRepository.findById(session.getUserId()));
    }

    @Override
    public void cleanupExpiredSessions() {
        sessionRepository.deleteByExpriationAtBefore(LocalDateTime.now());
    }
}