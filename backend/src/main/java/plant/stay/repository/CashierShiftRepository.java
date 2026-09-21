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
    /** Ca đang OPEN, mở trước khi kết thúc ngày (chưa chốt, có thể chặn chốt sổ ngày). */
    List<CashierShift> findByStatusAndOpenedAtBefore(CashierShiftStatus status, LocalDateTime before);
    /** Ca đã chốt trong ngày (dùng closedAt để gom vào sổ ngày). */
    List<CashierShift> findByClosedAtBetweenOrderByClosedAtAsc(LocalDateTime from, LocalDateTime to);
}