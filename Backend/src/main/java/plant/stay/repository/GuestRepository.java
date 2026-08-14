package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.Guest;

import java.util.List;
import java.util.Optional;

public interface GuestRepository extends JpaRepository<Guest, Long> {
    Optional<Guest> findByPhone(String phone);
    Optional<Guest> findByIdNumber(String idNumber);

    @Query("SELECT g FROM Guest g WHERE " +
           "LOWER(g.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "g.phone LIKE CONCAT('%', :keyword, '%') OR " +
           "g.idNumber LIKE CONCAT('%', :keyword, '%')")
    List<Guest> search(@Param("keyword") String keyword);
}
