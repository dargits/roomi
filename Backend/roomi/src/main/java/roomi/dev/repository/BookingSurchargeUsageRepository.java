package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import roomi.dev.model.BookingSurchargeUsage;

import java.math.BigDecimal;
import java.util.List;

public interface BookingSurchargeUsageRepository extends JpaRepository<BookingSurchargeUsage, Long> {
    List<BookingSurchargeUsage> findByBookingIdOrderByRecordedAtAscIdAsc(Long bookingId);

    boolean existsBySurchargeServiceId(Long surchargeServiceId);

    @Query("SELECT COALESCE(SUM(usage.lineTotal), 0) FROM BookingSurchargeUsage usage " +
            "WHERE usage.booking.id = :bookingId")
    BigDecimal sumLineTotalByBookingId(@Param("bookingId") Long bookingId);
}
