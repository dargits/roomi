package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.Session;
import plant.stay.model.User;

import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByUser(User user);
    Optional<Session> findBySession(String session);
}
