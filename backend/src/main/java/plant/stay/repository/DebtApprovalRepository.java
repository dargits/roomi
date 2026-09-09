package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import plant.stay.model.DebtApprovalRequest;
import plant.stay.model.DebtApprovalStatus;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

@Repository
public interface DebtApprovalRepository extends JpaRepository<DebtApprovalRequest, Long> {
    List<DebtApprovalRequest> findByBookingId(Long bookingId);
    List<DebtApprovalRequest> findByStatusOrderByRequestedAtDesc(DebtApprovalStatus status);
    Optional<DebtApprovalRequest> findFirstByBookingIdAndStatus(Long bookingId, DebtApprovalStatus status);

    @Query("SELECT d FROM DebtApprovalRequest d " +
           "JOIN FETCH d.booking b " +
           "JOIN FETCH d.invoice i " +
           "JOIN FETCH d.guest g " +
           "WHERE d.status = 'APPROVED' AND i.status != 'PAID'")
    List<DebtApprovalRequest> findActiveApprovedDebts();

    @Query("SELECT d FROM DebtApprovalRequest d " +
           "JOIN FETCH d.booking b JOIN FETCH d.invoice i JOIN FETCH d.guest g " +
           "WHERE d.status = 'APPROVED' AND i.status != 'PAID' AND d.dueDate = :dueDate")
    List<DebtApprovalRequest> findActiveApprovedDebtsDueOn(LocalDate dueDate);

       @Query("SELECT CASE WHEN COUNT(d) > 0 THEN true ELSE false END FROM DebtApprovalRequest d " +
                 "WHERE d.booking.id = :bookingId AND d.status = 'APPROVED' AND d.invoice.status != 'PAID'")
       boolean existsActiveApprovedDebtByBookingId(Long bookingId);
}
