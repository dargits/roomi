package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.AuditLog;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:entityName IS NULL OR a.entityName = :entityName) AND " +
           "(:actorId IS NULL OR a.actor.id = :actorId) AND " +
           "(:from IS NULL OR a.timestamp >= :from) AND " +
           "(:to IS NULL OR a.timestamp <= :to) " +
           "ORDER BY a.timestamp DESC")
    List<AuditLog> findWithFilters(@Param("entityName") String entityName,
                                   @Param("actorId") Long actorId,
                                   @Param("from") LocalDateTime from,
                                   @Param("to") LocalDateTime to);

    /**
     * NCL-12-CN-006 / QTN-24: Nhật ký các hành động liên quan dữ liệu cá nhân.
     * Actions được theo dõi: EXPORT_STAY_DECLARATION, DELETE_PERSONAL_DATA, VIEW_GUEST_DETAIL.
     */
    @Query("SELECT a FROM AuditLog a WHERE " +
           "a.action IN ('EXPORT_STAY_DECLARATION', 'DELETE_PERSONAL_DATA', 'VIEW_GUEST_DETAIL', 'COMPLETE_DECLARATION') AND " +
           "(:actorId IS NULL OR a.actor.id = :actorId) AND " +
           "(:from IS NULL OR a.timestamp >= :from) AND " +
           "(:to IS NULL OR a.timestamp <= :to) " +
           "ORDER BY a.timestamp DESC")
    List<AuditLog> findPersonalDataLogs(@Param("actorId") Long actorId,
                                        @Param("from") LocalDateTime from,
                                        @Param("to") LocalDateTime to);
}

