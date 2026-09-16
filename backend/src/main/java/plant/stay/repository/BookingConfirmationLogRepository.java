package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.BookingConfirmationLog;

import plant.stay.model.ConfirmationChannel;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingConfirmationLogRepository extends JpaRepository<BookingConfirmationLog, Long> {
    List<BookingConfirmationLog> findByBookingIdOrderBySentAtDesc(Long bookingId);

    Optional<BookingConfirmationLog> findFirstByBookingIdAndChannelOrderBySentAtDesc(Long bookingId, ConfirmationChannel channel);

    long countByBookingIdAndChannelAndSentAtGreaterThanEqual(Long bookingId, ConfirmationChannel channel, LocalDateTime since);
}
