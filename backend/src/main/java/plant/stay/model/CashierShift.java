package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cashier_shifts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashierShift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opened_by", nullable = false)
    private User openedBy;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "opening_cash", nullable = false, precision = 12, scale = 2)
    private BigDecimal openingCash;

    @Column(name = "opening_note", columnDefinition = "TEXT")
    private String openingNote;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CashierShiftStatus status = CashierShiftStatus.OPEN;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    private User closedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "invoice_cash", precision = 12, scale = 2)
    private BigDecimal invoiceCash;

    @Column(name = "invoice_transfer", precision = 12, scale = 2)
    private BigDecimal invoiceTransfer;

    @Column(name = "invoice_card", precision = 12, scale = 2)
    private BigDecimal invoiceCard;

    @Column(name = "deposit_cash", precision = 12, scale = 2)
    private BigDecimal depositCash;

    @Column(name = "deposit_transfer", precision = 12, scale = 2)
    private BigDecimal depositTransfer;

    @Column(name = "deposit_card", precision = 12, scale = 2)
    private BigDecimal depositCard;

    @Column(name = "refund_cash", precision = 12, scale = 2)
    private BigDecimal refundCash;

    @Column(name = "refund_transfer", precision = 12, scale = 2)
    private BigDecimal refundTransfer;

    @Column(name = "refund_card", precision = 12, scale = 2)
    private BigDecimal refundCard;

    @Column(name = "expected_cash", precision = 12, scale = 2)
    private BigDecimal expectedCash;

    @Column(name = "actual_cash", precision = 12, scale = 2)
    private BigDecimal actualCash;

    @Column(precision = 12, scale = 2)
    private BigDecimal discrepancy;

    @Column(name = "discrepancy_note", columnDefinition = "TEXT")
    private String discrepancyNote;
}