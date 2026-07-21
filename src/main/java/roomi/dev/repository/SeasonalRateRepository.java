package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import roomi.dev.model.SeasonalRate;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SeasonalRateRepository extends JpaRepository<SeasonalRate, Long> {
    
    List<SeasonalRate> findByRoomTypeId(Long roomTypeId);
    
    @Query("SELECT sr FROM SeasonalRate sr WHERE sr.roomType.id = :roomTypeId " +
           "AND :date >= sr.startDate AND :date < sr.endDate")
    Optional<SeasonalRate> findByRoomTypeIdAndDate(@Param("roomTypeId") Long roomTypeId, 
                                                   @Param("date") LocalDate date);
    
    @Query("SELECT sr FROM SeasonalRate sr WHERE sr.roomType.id = :roomTypeId " +
           "AND ((sr.startDate <= :endDate AND sr.endDate > :startDate))")
    List<SeasonalRate> findOverlappingRates(@Param("roomTypeId") Long roomTypeId,
                                           @Param("startDate") LocalDate startDate,
                                           @Param("endDate") LocalDate endDate);
    
    @Query("SELECT sr FROM SeasonalRate sr WHERE sr.roomType.id = :roomTypeId " +
           "AND ((sr.startDate <= :endDate AND sr.endDate > :startDate)) " +
           "AND sr.id != :excludeId")
    List<SeasonalRate> findOverlappingRatesExcluding(@Param("roomTypeId") Long roomTypeId,
                                                    @Param("startDate") LocalDate startDate,
                                                    @Param("endDate") LocalDate endDate,
                                                    @Param("excludeId") Long excludeId);
}