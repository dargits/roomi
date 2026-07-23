package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import roomi.dev.model.Invoice;

import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByBookingId(Long bookingId);
}
