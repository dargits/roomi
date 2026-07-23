package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import roomi.dev.model.SurchargeService;

import java.util.List;
import java.util.Optional;

public interface SurchargeServiceRepository extends JpaRepository<SurchargeService, Long> {
    List<SurchargeService> findAllByOrderByNameAsc();

    List<SurchargeService> findByActiveTrueOrderByNameAsc();

    Optional<SurchargeService> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}
