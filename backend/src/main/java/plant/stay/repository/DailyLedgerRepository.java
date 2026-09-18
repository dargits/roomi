package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.DailyLedger;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyLedgerRepository extends JpaRepository<DailyLedger, Long> {
    Optional<DailyLedger> findByDate(LocalDate date);
    List<DailyLedger> findByDateBetweenOrderByDateDesc(LocalDate from, LocalDate to);
    boolean existsByDate(LocalDate date);
}
