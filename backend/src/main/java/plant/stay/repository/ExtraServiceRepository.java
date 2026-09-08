package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.ExtraService;
import java.util.List;

@Repository
public interface ExtraServiceRepository extends JpaRepository<ExtraService, Long> {
    List<ExtraService> findAllByActiveTrue();
}
