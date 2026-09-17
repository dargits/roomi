package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Kết quả đối soát giữa Báo cáo Tuổi nợ và Báo cáo Doanh thu.
 * Chỉ có giá trị khi người dùng lọc theo kỳ trả phòng (fromCheckout / toCheckout).
 */
@Data
@Builder
public class DebtAgingReconciliationDto {
    /** Từ ngày trả phòng */
    private LocalDate fromCheckout;

    /** Đến ngày trả phòng */
    private LocalDate toCheckout;

    /**
     * Tổng dư nợ của các booking trả phòng trong kỳ (tính theo logic Báo cáo Tuổi nợ):
     * = invoice.totalAmount - totalPaid cho tất cả booking có checkOutDate trong [from, to]
     */
    private BigDecimal agingCheckoutDebt;

    /**
     * debtRevenue từ Báo cáo Doanh thu cùng kỳ:
     * = sum(effectiveRevenue) - sum(paidAmount) cho booking CHECKED_OUT trong [from, to]
     */
    private BigDecimal revenueReportDebt;

    /** Chênh lệch = agingCheckoutDebt - revenueReportDebt */
    private BigDecimal discrepancy;

    /** true nếu discrepancy == 0 (khớp 100%) */
    private boolean matched;
}
