package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import roomi.dev.model.Guest;

import java.util.List;
import java.util.Optional;

public interface GuestRepository extends JpaRepository<Guest, Long> {

    Optional<Guest> findByPhone(String phone);

    boolean existsByPhone(String phone);

    List<Guest> findByFullNameContainingIgnoreCase(String fullName);

    Optional<Guest> findByIdNumber(String idNumber);
}
