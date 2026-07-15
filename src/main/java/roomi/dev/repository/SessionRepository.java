package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import roomi.dev.model.Session;

import java.time.LocalDateTime;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByToken(String token);
    Optional<Session> findByUserId(Long userId);
    
    @Query("SELECT s FROM Session s WHERE s.token = ?1 AND s.expriationAt > ?2")
    Optional<Session> findValidSession(String token, LocalDateTime now);
    
    void deleteByExpriationAtBefore(LocalDateTime now);
}