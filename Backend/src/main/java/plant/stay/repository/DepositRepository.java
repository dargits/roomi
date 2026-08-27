package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.Deposit;
import plant.stay.model.DepositStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DepositRepository extends JpaRepository<Deposit, Long> {

    // Tìm khoản cọc của một booking
    List<Deposit> findByBookingIdOrderByCreatedAtDesc(Long bookingId);

    Optional<Deposit> findFirstByBookingIdOrderByCreatedAtDesc(Long bookingId);

    // Tìm khoản cọc của một hồ sơ đoàn
    List<Deposit> findByGroupBookingIdOrderByCreatedAtDesc(Long groupBookingId);

    Optional<Deposit> findFirstByGroupBookingIdOrderByCreatedAtDesc(Long groupBookingId);

    // Lịch sử cọc với filter
    @Query("SELECT d FROM Deposit d WHERE " +
           "(:bookingId IS NULL OR d.booking.id = :bookingId) " +
           "ORDER BY d.createdAt DESC")
    List<Deposit> findHistory(@Param("bookingId") Long bookingId);

    // NCL-07-CN-002: Khoản cọc tịch thu/phạt trong khoảng thời gian (cho báo cáo doanh thu)
    @Query("SELECT d FROM Deposit d WHERE d.status IN (:statuses) " +
           "AND CAST(d.processedAt AS date) >= :from AND CAST(d.processedAt AS date) <= :to")
    List<Deposit> findPenaltyDepositsBetween(
            @Param("statuses") List<DepositStatus> statuses,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    // Danh sách cọc chưa quyết toán (cho trang tổng hợp cọc)
    @Query("SELECT d FROM Deposit d WHERE d.status IN ('COLLECTED', 'SHORT_PAID') ORDER BY d.createdAt DESC")
    List<Deposit> findUnsettledDeposits();
}
