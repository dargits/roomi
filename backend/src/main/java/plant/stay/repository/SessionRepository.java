package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.Session;
import plant.stay.model.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Long> {
    List<Session> findByUser(User user);
    Optional<Session> findFirstByUserOrderByLastActiveAtDesc(User user);
    Optional<Session> findBySession(String session);
    List<Session> findByStatus(String status);
    List<Session> findByStatusOrderByLastActiveAtDesc(String status);
    List<Session> findByUserAndStatus(User user, String status);
    List<Session> findByUserIdAndStatus(Long userId, String status);
    List<Session> findByUserId(Long userId);
    long countByStatus(String status);
}
