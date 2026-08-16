package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Khoản đặt cọc gắn với một booking — NCL-11-CN-002 đến NCL-11-CN-006 (QTN-18, QTN-19, QTN-20)
 */
@Entity
@Table(name = "deposits")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Deposit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    // Số tiền cọc yêu cầu theo chính sách
    @Column(name = "required_amount", precision = 12, scale = 2)
    private BigDecimal requiredAmount;

    // Số tiền thực tế thu được
    @Column(name = "collected_amount", precision = 12, scale = 2)
    private BigDecimal collectedAmount;

    // Số tiền đã hoàn lại
    @Column(name = "refunded_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal refundedAmount = BigDecimal.ZERO;

    // Phí hủy/phí phạt giữ lại
    @Column(name = "penalty_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal penaltyAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DepositStatus status = DepositStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;

    // Lý do nếu thu thiếu so với chính sách (NCL-11-CN-002 AC-03)
    @Column(name = "short_paid_reason", columnDefinition = "TEXT")
    private String shortPaidReason;

    // Lý do hoàn/tịch thu (NCL-11-CN-003, NCL-11-CN-005)
    @Column(columnDefinition = "TEXT")
    private String note;

    // Người thu tiền cọc
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collected_by")
    private User collectedBy;

    // Người xử lý hoàn/tịch thu
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by")
    private User processedBy;

    @Column(name = "collected_at")
    private LocalDateTime collectedAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
