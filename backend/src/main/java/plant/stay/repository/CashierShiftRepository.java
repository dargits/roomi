package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.CashierShift;
import plant.stay.model.CashierShiftStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CashierShiftRepository extends JpaRepository<CashierShift, Long> {
    Optional<CashierShift> findByOpenedByIdAndStatus(Long openedById, CashierShiftStatus status);
    List<CashierShift> findByOpenedAtBetweenOrderByOpenedAtDesc(LocalDateTime from, LocalDateTime to);
    List<CashierShift> findByStatusOrderByOpenedAtDesc(CashierShiftStatus status);
}