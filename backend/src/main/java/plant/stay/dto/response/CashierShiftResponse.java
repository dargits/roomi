package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import plant.stay.model.CashierShiftStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class CashierShiftResponse {
    private Long id;
    private Long closingId;
    private CashierShiftStatus status;
    private Long openedById;
    private String openedByName;
    private LocalDateTime openedAt;
    private BigDecimal openingCash;
    private String openingNote;
    private Long closedById;
    private String closedByName;
    private LocalDateTime closedAt;
    private BigDecimal invoiceCash;
    private BigDecimal invoiceTransfer;
    private BigDecimal invoiceCard;
    private BigDecimal depositCash;
    private BigDecimal depositTransfer;
    private BigDecimal depositCard;
    private BigDecimal refundCash;
    private BigDecimal refundTransfer;
    private BigDecimal refundCard;
    private BigDecimal expectedCash;
    private BigDecimal actualCash;
    private BigDecimal discrepancy;
    private String discrepancyNote;
}