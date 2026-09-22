package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.BookingImportLog;

import java.util.List;

public interface BookingImportLogRepository extends JpaRepository<BookingImportLog, Long> {
    List<BookingImportLog> findAllByOrderByImportedAtDesc();
}
