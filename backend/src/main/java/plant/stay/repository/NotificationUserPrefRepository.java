package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.NotificationType;
import plant.stay.model.NotificationUserPref;

import java.util.List;
import java.util.Optional;

public interface NotificationUserPrefRepository extends JpaRepository<NotificationUserPref, Long> {
    List<NotificationUserPref> findByUserId(Long userId);
    Optional<NotificationUserPref> findByUserIdAndType(Long userId, NotificationType type);
}
