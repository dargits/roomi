package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.model.CleaningNotification;
import java.util.List;
import java.util.Optional;

@Repository
public interface CleaningNotificationRepository extends JpaRepository<CleaningNotification, Long> {
    
    List<CleaningNotification> findByIsRead(Boolean isRead);
    
    Optional<CleaningNotification> findByRoomIdAndIsRead(Long roomId, Boolean isRead);
    
    List<CleaningNotification> findByRoomId(Long roomId);
    
    @Transactional
    void deleteByRoomId(Long roomId);
}
