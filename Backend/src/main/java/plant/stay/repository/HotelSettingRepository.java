package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.HotelSetting;

@Repository
public interface HotelSettingRepository extends JpaRepository<HotelSetting, Long> {
}
