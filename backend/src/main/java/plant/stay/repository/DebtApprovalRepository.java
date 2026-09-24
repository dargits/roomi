package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import plant.stay.model.DebtApprovalRequest;
import plant.stay.model.DebtApprovalStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

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

    @Query("SELECT COUNT(d) > 0 FROM DebtApprovalRequest d WHERE d.booking.id = :bookingId AND d.status = 'APPROVED'")
    boolean existsActiveApprovedDebtByBookingId(@Param("bookingId") Long bookingId);

    @Query("SELECT DISTINCT d.booking.id FROM DebtApprovalRequest d WHERE d.booking.id IN :bookingIds AND d.status = 'APPROVED'")
    List<Long> findApprovedBookingIdsIn(@Param("bookingIds") List<Long> bookingIds);

    /**
     * Lấy các khoản nợ còn hiệu lực trong một kỳ trả phòng (để đối soát Báo cáo Doanh thu).
     */
    @Query("SELECT d FROM DebtApprovalRequest d " +
           "JOIN FETCH d.booking b " +
           "JOIN FETCH d.invoice i " +
           "JOIN FETCH d.guest g " +
           "WHERE d.status = 'APPROVED' AND i.status != 'PAID' " +
           "AND b.checkOutDate BETWEEN :fromDate AND :toDate")
    List<DebtApprovalRequest> findActiveApprovedDebtsByCheckoutBetween(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    /**
     * Lấy các khoản nợ APPROVED có nextReminderDate <= hôm nay để gửi nhắc nhở tự động.
     */
    @Query("SELECT d FROM DebtApprovalRequest d " +
           "JOIN FETCH d.guest g " +
           "JOIN FETCH d.invoice i " +
           "WHERE d.status = 'APPROVED' AND i.status != 'PAID' " +
           "AND d.nextReminderDate IS NOT NULL AND d.nextReminderDate <= :today")
    List<DebtApprovalRequest> findDebtsNeedingReminder(@Param("today") LocalDate today);
}
