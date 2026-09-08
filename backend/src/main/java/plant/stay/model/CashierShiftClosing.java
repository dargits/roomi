package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cashier_shift_closings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashierShiftClosing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id", nullable = false)
    private CashierShift shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by", nullable = false)
    private User closedBy;

    @Column(name = "closed_at", nullable = false)
    private LocalDateTime closedAt;

    @Column(name = "opening_cash", nullable = false, precision = 12, scale = 2)
    private BigDecimal openingCash;

    @Column(name = "invoice_cash", nullable = false, precision = 12, scale = 2)
    private BigDecimal invoiceCash;

    @Column(name = "invoice_transfer", nullable = false, precision = 12, scale = 2)
    private BigDecimal invoiceTransfer;

    @Column(name = "invoice_card", nullable = false, precision = 12, scale = 2)
    private BigDecimal invoiceCard;

    @Column(name = "deposit_cash", nullable = false, precision = 12, scale = 2)
    private BigDecimal depositCash;

    @Column(name = "deposit_transfer", nullable = false, precision = 12, scale = 2)
    private BigDecimal depositTransfer;

    @Column(name = "deposit_card", nullable = false, precision = 12, scale = 2)
    private BigDecimal depositCard;

    @Column(name = "refund_cash", nullable = false, precision = 12, scale = 2)
    private BigDecimal refundCash;

    @Column(name = "refund_transfer", nullable = false, precision = 12, scale = 2)
    private BigDecimal refundTransfer;

    @Column(name = "refund_card", nullable = false, precision = 12, scale = 2)
    private BigDecimal refundCard;

    @Column(name = "expected_cash", nullable = false, precision = 12, scale = 2)
    private BigDecimal expectedCash;

    @Column(name = "actual_cash", nullable = false, precision = 12, scale = 2)
    private BigDecimal actualCash;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal discrepancy;

    @Column(name = "discrepancy_note", columnDefinition = "TEXT")
    private String discrepancyNote;
}