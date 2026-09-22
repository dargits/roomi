package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import plant.stay.model.RoomCleaningRecord;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomCleaningRecordRepository extends JpaRepository<RoomCleaningRecord, Long> {

    Optional<RoomCleaningRecord> findTopByRoomIdOrderByIdDesc(Long roomId);

    List<RoomCleaningRecord> findByHousekeeperId(Long housekeeperId);

    @Query("SELECT r FROM RoomCleaningRecord r WHERE r.completedAt >= :startDate AND r.completedAt <= :endDate ORDER BY r.completedAt DESC")
    List<RoomCleaningRecord> findCompletedBetween(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT r FROM RoomCleaningRecord r WHERE r.housekeeper.id = :housekeeperId AND r.completedAt >= :startDate AND r.completedAt <= :endDate ORDER BY r.completedAt DESC")
    List<RoomCleaningRecord> findCompletedByHousekeeperBetween(
            @Param("housekeeperId") Long housekeeperId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT r FROM RoomCleaningRecord r WHERE r.startedAt >= :startDate AND r.startedAt <= :endDate ORDER BY r.startedAt DESC")
    List<RoomCleaningRecord> findStartedBetween(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT r FROM RoomCleaningRecord r WHERE r.housekeeper.id = :housekeeperId AND r.startedAt >= :startDate AND r.startedAt <= :endDate ORDER BY r.startedAt DESC")
    List<RoomCleaningRecord> findStartedByHousekeeperBetween(
            @Param("housekeeperId") Long housekeeperId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}
