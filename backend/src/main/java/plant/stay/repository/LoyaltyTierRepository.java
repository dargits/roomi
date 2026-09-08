package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.LoyaltyTier;

import java.util.List;

public interface LoyaltyTierRepository extends JpaRepository<LoyaltyTier, Long> {
    List<LoyaltyTier> findAllByOrderByMinPointsAsc();
}
