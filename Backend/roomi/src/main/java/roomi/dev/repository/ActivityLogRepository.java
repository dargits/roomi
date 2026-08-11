package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import roomi.dev.model.ActivityLog;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByEntityNameAndEntityIdOrderByCreatedAtDesc(String entityName, Long entityId);
    List<ActivityLog> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<ActivityLog> findAllByOrderByCreatedAtDesc();
}
