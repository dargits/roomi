package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.HolidayPrice;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HolidayPriceRepository extends JpaRepository<HolidayPrice, Long> {
    List<HolidayPrice> findByRoomTypeId(Long roomTypeId);

    @Query("SELECT h FROM HolidayPrice h WHERE h.roomType.id = :roomTypeId AND h.holidayDate = :date AND h.active = true")
    Optional<HolidayPrice> findByRoomTypeAndDate(@Param("roomTypeId") Long roomTypeId, @Param("date") LocalDate date);

    @Query("SELECT h FROM HolidayPrice h WHERE h.holidayDate BETWEEN :startDate AND :endDate AND h.active = true")
    List<HolidayPrice> findBetweenDates(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
