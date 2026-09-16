package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.BookingConfirmationLog;

import java.util.List;

@Repository
public interface BookingConfirmationLogRepository extends JpaRepository<BookingConfirmationLog, Long> {
    List<BookingConfirmationLog> findByBookingIdOrderBySentAtDesc(Long bookingId);
}
