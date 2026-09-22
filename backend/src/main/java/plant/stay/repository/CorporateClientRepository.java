package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.CorporateClient;

import java.util.List;
import java.util.Optional;

public interface CorporateClientRepository extends JpaRepository<CorporateClient, Long> {

    List<CorporateClient> findAllByOrderByIdDesc();

    List<CorporateClient> findByActiveTrueOrderByIdDesc();

    Optional<CorporateClient> findByTaxCode(String taxCode);

    @Query("SELECT c FROM CorporateClient c WHERE " +
           "LOWER(c.companyName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "(c.taxCode IS NOT NULL AND c.taxCode LIKE CONCAT('%', :keyword, '%')) OR " +
           "(c.contactPerson IS NOT NULL AND LOWER(c.contactPerson) LIKE LOWER(CONCAT('%', :keyword, '%'))) OR " +
           "(c.contactPhone IS NOT NULL AND c.contactPhone LIKE CONCAT('%', :keyword, '%')) " +
           "ORDER BY c.id DESC")
    List<CorporateClient> search(@Param("keyword") String keyword);
}
