package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.BookingRequest;
import plant.stay.model.BookingRequestStatus;

import java.util.List;

public interface BookingRequestRepository extends JpaRepository<BookingRequest, Long> {
    List<BookingRequest> findByStatusOrderByCreatedAtDesc(BookingRequestStatus status);
    List<BookingRequest> findAllByOrderByCreatedAtDesc();
}
