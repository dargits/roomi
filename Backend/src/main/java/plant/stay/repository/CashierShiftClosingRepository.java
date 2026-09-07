package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.CashierShiftClosing;

import java.time.LocalDateTime;
import java.util.List;

public interface CashierShiftClosingRepository extends JpaRepository<CashierShiftClosing, Long> {
    List<CashierShiftClosing> findByClosedAtBetweenOrderByClosedAtDesc(LocalDateTime from, LocalDateTime to);
    List<CashierShiftClosing> findByShiftOpenedByIdOrderByClosedAtDesc(Long openedById);
}