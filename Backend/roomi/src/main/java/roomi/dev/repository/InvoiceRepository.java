package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param; // Import ở đây
import roomi.dev.dto.response.RevenueReportResponse;
import roomi.dev.model.Invoice;

import java.time.LocalDateTime; // Import ở đây
import java.util.List;
import java.util.Optional;
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByBookingId(Long bookingId);
    @Query("SELECT SUM(i.roomCharge), SUM(i.serviceCharge - i.discount), COUNT(i) FROM Invoice i " +
           "WHERE i.status = roomi.dev.model.Invoice.Status.PAID " +
           "AND i.createdAt >= :startDateTime AND i.createdAt <= :endDateTime")
    List<Object[]> findRevenueSummary(@Param("startDateTime") LocalDateTime startDateTime, 
                                      @Param("endDateTime") LocalDateTime endDateTime);

    @Query("SELECT new roomi.dev.dto.response.RevenueReportResponse$RoomTypeRevenueDetail(" +
           "i.booking.roomType.name, SUM(i.roomCharge), COUNT(i)) " +
           "FROM Invoice i " +
           "WHERE i.status = roomi.dev.model.Invoice.Status.PAID " +
           "AND i.createdAt >= :startDateTime AND i.createdAt <= :endDateTime " +
           "GROUP BY i.booking.roomType.name")
    List<RevenueReportResponse.RoomTypeRevenueDetail> findRevenueByRoomType(
            @Param("startDateTime") LocalDateTime startDateTime, 
            @Param("endDateTime") LocalDateTime endDateTime);

    /**
     * Doanh thu tổng (phòng + dịch vụ - giảm giá) từng ngày — dùng cho chart "Xu Hướng Doanh Thu Theo Ngày".
     * Group by YYYY-MM-DD của createdAt, trả về mỗi ngày 1 row gồm: dateStr, totalRevenue.
     */
    @Query("SELECT FUNCTION('DATE', i.createdAt), SUM(i.totalAmount) " +
           "FROM Invoice i " +
           "WHERE i.status = roomi.dev.model.Invoice.Status.PAID " +
           "AND i.createdAt >= :startDateTime AND i.createdAt <= :endDateTime " +
           "GROUP BY FUNCTION('DATE', i.createdAt) " +
           "ORDER BY FUNCTION('DATE', i.createdAt)")
    List<Object[]> findDailyRevenue(@Param("startDateTime") LocalDateTime startDateTime,
                                    @Param("endDateTime") LocalDateTime endDateTime);
}
