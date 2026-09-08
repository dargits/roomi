package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.RoomStayGuest;

import java.util.List;

@Repository
public interface RoomStayGuestRepository extends JpaRepository<RoomStayGuest, Long> {
    List<RoomStayGuest> findByBookingIdOrderByCreatedAtAsc(Long bookingId);
    long countByBookingIdAndLeftEarlyAtIsNull(Long bookingId);
}
