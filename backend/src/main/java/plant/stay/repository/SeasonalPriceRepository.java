package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.SeasonalPrice;

import java.time.LocalDate;
import java.util.List;

public interface SeasonalPriceRepository extends JpaRepository<SeasonalPrice, Long> {
    List<SeasonalPrice> findByRoomTypeId(Long roomTypeId);

    // Kiểm tra có chồng ngày không (loại trừ bản ghi hiện tại khi update)
    @Query("SELECT sp FROM SeasonalPrice sp WHERE sp.roomType.id = :roomTypeId " +
           "AND sp.id <> :excludeId " +
           "AND sp.startDate <= :endDate AND sp.endDate >= :startDate")
    List<SeasonalPrice> findOverlapping(@Param("roomTypeId") Long roomTypeId,
                                        @Param("startDate") LocalDate startDate,
                                        @Param("endDate") LocalDate endDate,
                                        @Param("excludeId") Long excludeId);

    // Tìm giá theo mùa áp dụng cho 1 ngày cụ thể
    @Query("SELECT sp FROM SeasonalPrice sp WHERE sp.roomType.id = :roomTypeId " +
           "AND sp.startDate <= :date AND sp.endDate >= :date")
    List<SeasonalPrice> findByRoomTypeAndDate(@Param("roomTypeId") Long roomTypeId, @Param("date") LocalDate date);
}
