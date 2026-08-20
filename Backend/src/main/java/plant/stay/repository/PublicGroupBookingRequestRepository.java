package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.PublicGroupBookingRequest;

import java.util.List;

public interface PublicGroupBookingRequestRepository extends JpaRepository<PublicGroupBookingRequest, Long> {
	List<PublicGroupBookingRequest> findAllByOrderByCreatedAtDesc();
}