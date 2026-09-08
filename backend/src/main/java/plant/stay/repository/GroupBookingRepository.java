package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.GroupBooking;

import java.util.List;

public interface GroupBookingRepository extends JpaRepository<GroupBooking, Long> {
    List<GroupBooking> findAllByOrderByCreatedAtDesc();
    List<GroupBooking> findByRepresentativeGuestId(Long representativeGuestId);
}