package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_ledgers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DailyLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private DailyLedgerStatus status = DailyLedgerStatus.OPEN;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    private User closedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "open_reason", columnDefinition = "TEXT")
    private String openReason;

    @Column(name = "total_invoice_cash", precision = 14, scale = 2)
    private BigDecimal totalInvoiceCash;
    @Column(name = "total_invoice_transfer", precision = 14, scale = 2)
    private BigDecimal totalInvoiceTransfer;
    @Column(name = "total_invoice_card", precision = 14, scale = 2)
    private BigDecimal totalInvoiceCard;
    @Column(name = "total_deposit_cash", precision = 14, scale = 2)
    private BigDecimal totalDepositCash;
    @Column(name = "total_deposit_transfer", precision = 14, scale = 2)
    private BigDecimal totalDepositTransfer;
    @Column(name = "total_deposit_card", precision = 14, scale = 2)
    private BigDecimal totalDepositCard;
    @Column(name = "total_refund_cash", precision = 14, scale = 2)
    private BigDecimal totalRefundCash;
    @Column(name = "total_refund_transfer", precision = 14, scale = 2)
    private BigDecimal totalRefundTransfer;
    @Column(name = "total_refund_card", precision = 14, scale = 2)
    private BigDecimal totalRefundCard;
    @Column(name = "total_expected_cash", precision = 14, scale = 2)
    private BigDecimal totalExpectedCash;
    @Column(name = "total_actual_cash", precision = 14, scale = 2)
    private BigDecimal totalActualCash;
    @Column(name = "total_discrepancy", precision = 14, scale = 2)
    private BigDecimal totalDiscrepancy;
    @Column(name = "cash_handover_amount", precision = 14, scale = 2)
    private BigDecimal cashHandoverAmount;
}
