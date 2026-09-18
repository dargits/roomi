package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import plant.stay.model.DailyLedgerStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class DailyLedgerResponse {

    private LocalDate date;
    private DailyLedgerStatus status;

    /** Danh sach phieu chot ca da khoa trong ngay */
    private List<CashierShiftResponse> shifts;

    /** Danh sach ca con mo - neu co, chua duoc phep chot so ngay */
    private List<OpenShiftInfo> openShifts;

    private BigDecimal totalInvoiceCash;
    private BigDecimal totalInvoiceTransfer;
    private BigDecimal totalInvoiceCard;
    private BigDecimal totalDepositCash;
    private BigDecimal totalDepositTransfer;
    private BigDecimal totalDepositCard;
    private BigDecimal totalRefundCash;
    private BigDecimal totalRefundTransfer;
    private BigDecimal totalRefundCard;
    private BigDecimal totalExpectedCash;
    private BigDecimal totalActualCash;
    private BigDecimal totalDiscrepancy;
    private BigDecimal cashHandoverAmount;

    private Long closedById;
    private String closedByName;
    private LocalDateTime closedAt;
    private String openReason;

    @Data
    @Builder
    public static class OpenShiftInfo {
        private Long shiftId;
        private String openedByName;
        private LocalDateTime openedAt;
    }
}
