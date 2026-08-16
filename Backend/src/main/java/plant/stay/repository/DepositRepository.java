package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.Deposit;

import java.util.List;
import java.util.Optional;

public interface DepositRepository extends JpaRepository<Deposit, Long> {

    // Tìm khoản cọc của một booking
    List<Deposit> findByBookingIdOrderByCreatedAtDesc(Long bookingId);

    Optional<Deposit> findFirstByBookingIdOrderByCreatedAtDesc(Long bookingId);

    // Lịch sử cọc với filter
    @Query("SELECT d FROM Deposit d WHERE " +
           "(:bookingId IS NULL OR d.booking.id = :bookingId) " +
           "ORDER BY d.createdAt DESC")
    List<Deposit> findHistory(@Param("bookingId") Long bookingId);
}
