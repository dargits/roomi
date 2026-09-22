package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.NegotiatedPriceAgreement;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface NegotiatedPriceAgreementRepository extends JpaRepository<NegotiatedPriceAgreement, Long> {

    List<NegotiatedPriceAgreement> findAllByOrderByIdDesc();

    List<NegotiatedPriceAgreement> findByCorporateClientIdOrderByIdDesc(Long corporateClientId);

    List<NegotiatedPriceAgreement> findByGroupBookingIdOrderByIdDesc(Long groupBookingId);

    @Query("SELECT a FROM NegotiatedPriceAgreement a WHERE " +
           "a.groupBooking.id = :groupBookingId AND " +
           "a.active = true AND " +
           ":date >= a.startDate AND :date <= a.endDate " +
           "ORDER BY a.id DESC")
    List<NegotiatedPriceAgreement> findActiveByGroupBookingIdAndDate(
            @Param("groupBookingId") Long groupBookingId,
            @Param("date") LocalDate date
    );

    @Query("SELECT a FROM NegotiatedPriceAgreement a WHERE " +
           "a.corporateClient.id = :corporateClientId AND " +
           "a.corporateClient.active = true AND " +
           "a.active = true AND " +
           ":date >= a.startDate AND :date <= a.endDate " +
           "ORDER BY a.id DESC")
    List<NegotiatedPriceAgreement> findActiveByCorporateClientIdAndDate(
            @Param("corporateClientId") Long corporateClientId,
            @Param("date") LocalDate date
    );
}
