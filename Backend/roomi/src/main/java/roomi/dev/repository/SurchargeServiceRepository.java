package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import roomi.dev.model.SurchargeService;

import java.util.List;
import java.util.Optional;

public interface SurchargeServiceRepository extends JpaRepository<SurchargeService, Long> {

    boolean existsByName(String name);

    boolean existsByNameIgnoreCase(String name);

    Optional<SurchargeService> findByNameIgnoreCase(String name);

    List<SurchargeService> findByActiveTrue();

    List<SurchargeService> findByActiveTrueOrderByNameAsc();

    List<SurchargeService> findAllByOrderByNameAsc();
}
