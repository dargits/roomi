package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import roomi.dev.entity.Session;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findBySession(String sessionId);
    Optional<Session> findByUserId(Long userId);
    
    @Query("SELECT s FROM Session s WHERE s.session = :sessionId AND s.expiresAt > :now")
    Optional<Session> findValidSession(String sessionId, LocalDateTime now);
    
    void deleteByExpiresAtBefore(LocalDateTime now);
}