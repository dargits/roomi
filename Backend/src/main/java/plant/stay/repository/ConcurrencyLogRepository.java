package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.ConcurrencyLog;

import java.time.LocalDateTime;
import java.util.List;

public interface ConcurrencyLogRepository extends JpaRepository<ConcurrencyLog, Long> {

    // Lấy log từ stress test theo session
    List<ConcurrencyLog> findByTestSessionIdOrderByOccurredAtAsc(String testSessionId);

    // Lấy toàn bộ log gần đây
    List<ConcurrencyLog> findTop100ByOrderByOccurredAtDesc();

    // Lấy log không phải stress test (log thật)
    List<ConcurrencyLog> findByFromStressTestFalseOrderByOccurredAtDesc();

    // Lấy log của một phòng
    @Query("SELECT c FROM ConcurrencyLog c WHERE c.room.id = :roomId ORDER BY c.occurredAt DESC")
    List<ConcurrencyLog> findByRoomId(@Param("roomId") Long roomId);

    // Lấy log trong khoảng thời gian
    List<ConcurrencyLog> findByOccurredAtBetweenOrderByOccurredAtDesc(LocalDateTime from, LocalDateTime to);
}
