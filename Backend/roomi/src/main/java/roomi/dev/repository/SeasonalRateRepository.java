package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import roomi.dev.model.SeasonalRate;

import java.time.LocalDate;
import java.util.List;

public interface SeasonalRateRepository extends JpaRepository<SeasonalRate, Long> {

    List<SeasonalRate> findByRoomTypeId(Long roomTypeId);

    // Kiểm tra khoảng thời gian bị chồng lấn với bản ghi khác (loại trừ id hiện tại khi update)
    @Query("SELECT COUNT(s) > 0 FROM SeasonalRate s " +
           "WHERE s.roomType.id = :roomTypeId " +
           "AND s.id <> :excludeId " +
           "AND s.startDate <= :endDate " +
           "AND s.endDate >= :startDate")
    boolean existsOverlap(@Param("roomTypeId") Long roomTypeId,
                          @Param("startDate") LocalDate startDate,
                          @Param("endDate") LocalDate endDate,
                          @Param("excludeId") Long excludeId);
}
