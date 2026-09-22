package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.DismissedPriceSuggestion;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DismissedPriceSuggestionRepository extends JpaRepository<DismissedPriceSuggestion, Long> {

    Optional<DismissedPriceSuggestion> findByTargetDate(LocalDate targetDate);

    boolean existsByTargetDate(LocalDate targetDate);

    List<DismissedPriceSuggestion> findByTargetDateBetween(LocalDate startDate, LocalDate endDate);

    void deleteByTargetDate(LocalDate targetDate);
}
