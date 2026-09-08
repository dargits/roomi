package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.DiscountStatus;
import plant.stay.model.InvoiceDiscount;

import java.util.Optional;

/**
 * Repository cho InvoiceDiscount.
 * Quy tắc nghiệp vụ: mỗi hóa đơn chỉ có 1 khoản giảm giá đang hiệu lực
 * (status = APPLIED hoặc PENDING_APPROVAL).
 */
public interface InvoiceDiscountRepository extends JpaRepository<InvoiceDiscount, Long> {

    /**
     * Tìm khoản giảm giá đang hiệu lực của một hóa đơn.
     * "Hiệu lực" = status là APPLIED hoặc PENDING_APPROVAL (không phải REJECTED).
     */
    @Query("SELECT d FROM InvoiceDiscount d WHERE d.invoice.id = :invoiceId AND d.status != :rejectedStatus")
    Optional<InvoiceDiscount> findActiveByInvoiceId(
            @Param("invoiceId") Long invoiceId,
            @Param("rejectedStatus") DiscountStatus rejectedStatus
    );

    /**
     * Kiểm tra nhanh xem hóa đơn đã có khoản giảm giá đang hiệu lực chưa.
     */
    @Query("SELECT COUNT(d) > 0 FROM InvoiceDiscount d WHERE d.invoice.id = :invoiceId AND d.status != :rejectedStatus")
    boolean existsActiveByInvoiceId(
            @Param("invoiceId") Long invoiceId,
            @Param("rejectedStatus") DiscountStatus rejectedStatus
    );
}
