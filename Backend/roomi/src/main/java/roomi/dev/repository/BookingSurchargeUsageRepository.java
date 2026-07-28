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
    List<BookingSurchargeUsage> findByBookingIdOrderByRecordedAtAscIdAsc(Long bookingId);

    boolean existsBySurchargeServiceId(Long surchargeServiceId);

    @Query("SELECT COALESCE(SUM(usage.lineTotal), 0) FROM BookingSurchargeUsage usage " +
            "WHERE usage.booking.id = :bookingId")
    BigDecimal sumLineTotalByBookingId(@Param("bookingId") Long bookingId);
    @Query("SELECT new roomi.dev.dto.response.RevenueReportResponse$ServiceRevenueDetail(" +
           "u.surchargeService.name, SUM(u.lineTotal), SUM(CAST(u.quantity AS long))) " +
           "FROM BookingSurchargeUsage u " +
           "JOIN Invoice i ON i.booking.id = u.booking.id " +
           "WHERE i.status = roomi.dev.model.Invoice.Status.PENDING " +
           "AND i.createdAt >= :startDateTime AND i.createdAt <= :endDateTime " +
           "GROUP BY u.surchargeService.name")
    List<RevenueReportResponse.ServiceRevenueDetail> findRevenueByService(
            @Param("startDateTime") LocalDateTime startDateTime, 
            @Param("endDateTime") LocalDateTime endDateTime);
}
