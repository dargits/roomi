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
    @Query("SELECT SUM(i.roomCharge), SUM(i.serviceCharge), COUNT(i) FROM Invoice i " +
           "WHERE i.status = roomi.dev.model.Invoice.Status.PENDING " +
           "AND i.createdAt >= :startDateTime AND i.createdAt <= :endDateTime")
    List<Object[]> findRevenueSummary(@Param("startDateTime") LocalDateTime startDateTime, 
                                      @Param("endDateTime") LocalDateTime endDateTime);
    // Bắt buộc phải viết đường dẫn đầy đủ của class DTO bên trong chuỗi Query
    @Query("SELECT new roomi.dev.dto.response.RevenueReportResponse$RoomTypeRevenueDetail(" +
           "i.booking.roomType.name, SUM(i.roomCharge), COUNT(i)) " +
           "FROM Invoice i " +
           "WHERE i.status = roomi.dev.model.Invoice.Status.PENDING " +
           "AND i.createdAt >= :startDateTime AND i.createdAt <= :endDateTime " +
           "GROUP BY i.booking.roomType.name")
    List<RevenueReportResponse.RoomTypeRevenueDetail> findRevenueByRoomType(
            @Param("startDateTime") LocalDateTime startDateTime, 
            @Param("endDateTime") LocalDateTime endDateTime);
}
