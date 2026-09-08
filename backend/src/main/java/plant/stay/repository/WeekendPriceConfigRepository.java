package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.WeekendPriceConfig;

import java.util.List;
import java.util.Optional;

public interface WeekendPriceConfigRepository extends JpaRepository<WeekendPriceConfig, Long> {
    List<WeekendPriceConfig> findByRoomTypeId(Long roomTypeId);
    
    Optional<WeekendPriceConfig> findFirstByRoomTypeIdAndActiveTrue(Long roomTypeId);
    
    @Query("SELECT w FROM WeekendPriceConfig w WHERE w.active = true")
    List<WeekendPriceConfig> findAllActive();
}
