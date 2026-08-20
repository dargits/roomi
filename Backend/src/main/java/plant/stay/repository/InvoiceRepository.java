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
}
