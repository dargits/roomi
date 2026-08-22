package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.Invoice;
import plant.stay.model.InvoiceMode;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByBookingId(Long bookingId);
    List<Invoice> findByGroupBookingIdOrderByIdAsc(Long groupBookingId);
    Optional<Invoice> findFirstByGroupBookingIdAndModeAndAdjustmentOfIsNull(Long groupBookingId, InvoiceMode mode);

    @Query("SELECT i FROM Invoice i WHERE i.booking.id = :bookingId OR " +
           "(i.mode = 'COMBINED' AND i.groupBooking.id = " +
           "(SELECT b.groupBooking.id FROM Booking b WHERE b.id = :bookingId)) ORDER BY i.id DESC")
    List<Invoice> findInvoicesCoveringBooking(@Param("bookingId") Long bookingId);

    /**
     * NCL-12-CN-005 / QTN-24: Tìm hóa đơn PENDING liên kết với khách.
     * Bao gồm hóa đơn của từng booking lẫn hóa đơn gộp đoàn mà khách là đại diện.
     */
    @Query("SELECT i FROM Invoice i WHERE i.status = 'PENDING' AND (" +
           "  i.booking.guest.id = :guestId OR " +
           "  (i.groupBooking IS NOT NULL AND i.groupBooking.representativeGuest.id = :guestId)" +
           ")")
    List<Invoice> findByGuestIdAndStatusPending(@Param("guestId") Long guestId);
}

