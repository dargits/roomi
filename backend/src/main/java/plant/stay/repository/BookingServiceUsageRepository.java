package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.BookingServiceUsage;

import java.util.List;

public interface BookingServiceUsageRepository extends JpaRepository<BookingServiceUsage, Long> {
    List<BookingServiceUsage> findByBookingId(Long bookingId);
    void deleteByBookingId(Long bookingId);
}
