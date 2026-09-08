package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.StayDeclaration;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StayDeclarationRepository extends JpaRepository<StayDeclaration, Long> {
    Optional<StayDeclaration> findByBookingId(Long bookingId);

    List<StayDeclaration> findByBookingIdIn(Collection<Long> bookingIds);
}