package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import plant.stay.model.IncidentStatus;
import plant.stay.model.RoomIncident;

import java.util.List;

@Repository
public interface RoomIncidentRepository extends JpaRepository<RoomIncident, Long> {
    List<RoomIncident> findByRoomIdOrderByReportedAtDesc(Long roomId);
    List<RoomIncident> findByStatusOrderByReportedAtDesc(IncidentStatus status);

    @Query("SELECT r FROM RoomIncident r " +
           "JOIN FETCH r.room rm " +
           "WHERE (:status IS NULL OR r.status = :status) " +
           "ORDER BY r.reportedAt DESC")
    List<RoomIncident> findByStatusFilter(@Param("status") IncidentStatus status);

    long countByRoomIdAndStatus(Long roomId, IncidentStatus status);
}
