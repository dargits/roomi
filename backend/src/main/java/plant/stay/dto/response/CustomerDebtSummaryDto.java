package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Tổng hợp công nợ của một khách hàng / doanh nghiệp có nhiều lần lưu trú còn nợ.
 */
@Data
@Builder
public class CustomerDebtSummaryDto {
    private Long guestId;
    private String guestName;
    private String guestPhone;
    private String guestEmail;

    /** Tổng dư nợ gộp của tất cả các hóa đơn chưa tất toán */
    private BigDecimal totalDebt;

    /** Số hóa đơn còn nợ */
    private int invoiceCount;

    /** Hạn cam kết thanh toán sớm nhất trong các hóa đơn */
    private LocalDate earliestDueDate;

    /** Số ngày quá hạn lớn nhất trong các hóa đơn */
    private long maxDaysOverdue;

    /** Mã nhóm tuổi nợ cao nhất: CURRENT, OVERDUE_UNDER_15, OVERDUE_15_TO_30, OVERDUE_OVER_30 */
    private String highestRiskBucket;
}
