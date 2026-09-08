package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Thực thể lưu thông tin khoản giảm giá áp dụng cho một hóa đơn.
 * Mỗi hóa đơn chỉ có tối đa 1 khoản giảm giá đang hiệu lực (status != REJECTED).
 * Muốn thay đổi: xóa khoản cũ (DELETE /discount) rồi tạo lại (POST /discount).
 */
@Entity
@Table(name = "invoice_discounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceDiscount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Hóa đơn được áp dụng giảm giá. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    /** Loại giảm giá: theo % hoặc số tiền cố định. */
    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 20)
    private DiscountType discountType;

    /**
     * Giá trị do lễ tân nhập vào:
     *  - Nếu PERCENTAGE → số % (vd: 10.00 tương đương 10%)
     *  - Nếu FIXED_AMOUNT → số tiền cụ thể (vd: 50000)
     */
    @Column(name = "discount_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountValue;

    /**
     * Số tiền giảm thực tế (đã được tính ra từ discountValue).
     * Luôn dùng giá trị này để cập nhật Invoice.discountAmount.
     * QTN-12: calculatedAmount >= 0 && calculatedAmount <= (roomAmount + serviceAmount)
     */
    @Column(name = "calculated_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal calculatedAmount;

    /** Lý do giảm giá – bắt buộc nhập (validation ở DTO layer). */
    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    /** Trạng thái phê duyệt của khoản giảm giá này. */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private DiscountStatus status = DiscountStatus.PENDING_APPROVAL;

    /** Thời điểm tạo khoản giảm giá. */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /** Lễ tân tạo khoản giảm giá. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    /** Thời điểm Owner duyệt / từ chối. */
    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    /** Owner duyệt / từ chối. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    /** Lý do từ chối (chỉ điền khi status = REJECTED). */
    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;
}
