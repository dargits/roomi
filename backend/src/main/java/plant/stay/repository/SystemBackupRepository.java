package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.SystemBackup;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SystemBackupRepository extends JpaRepository<SystemBackup, Long> {

    List<SystemBackup> findAllByOrderByCreatedAtDesc();

    List<SystemBackup> findByCreatedAtBefore(LocalDateTime threshold);

    Optional<SystemBackup> findByFileName(String fileName);
}
