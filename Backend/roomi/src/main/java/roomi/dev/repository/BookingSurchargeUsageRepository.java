package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import roomi.dev.dto.response.RevenueReportResponse;
import roomi.dev.model.BookingSurchargeUsage;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface BookingSurchargeUsageRepository extends JpaRepository<BookingSurchargeUsage, Long> {

    List<BookingSurchargeUsage> findByBookingId(Long bookingId);

    List<BookingSurchargeUsage> findByBookingIdOrderByRecordedAtAscIdAsc(Long bookingId);

    @Query("SELECT COALESCE(SUM(u.lineTotal), 0) FROM BookingSurchargeUsage u WHERE u.booking.id = :bookingId")
    BigDecimal sumLineTotalByBookingId(@Param("bookingId") Long bookingId);

    boolean existsBySurchargeServiceId(Long surchargeServiceId);

    @Query("SELECT new roomi.dev.dto.response.RevenueReportResponse$ServiceRevenueDetail(" +
           "u.serviceName, SUM(u.lineTotal), COUNT(u)) " +
           "FROM BookingSurchargeUsage u " +
           "WHERE u.booking.id IN (SELECT inv.booking.id FROM Invoice inv WHERE inv.status = roomi.dev.model.Invoice.Status.PAID) " +
           "AND u.recordedAt >= :startDateTime AND u.recordedAt <= :endDateTime " +
           "GROUP BY u.serviceName")
    List<RevenueReportResponse.ServiceRevenueDetail> findRevenueByService(
            @Param("startDateTime") LocalDateTime startDateTime,
            @Param("endDateTime") LocalDateTime endDateTime);
}
