package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Toàn bộ dữ liệu Báo cáo Tuổi nợ & Nhắc thu.
 */
@Data
@Builder
public class DebtAgingReportResponse {
    /** Ngày chốt số liệu */
    private LocalDate asOfDate;

    /** Tổng dư nợ toàn hệ thống */
    private BigDecimal grandTotalDebt;

    /** Tổng số hóa đơn còn nợ */
    private int totalInvoices;

    /** 4 nhóm tuổi nợ kèm tỷ trọng % */
    private List<DebtAgingBucketDto> buckets;

    /** Danh sách chi tiết từng khoản nợ (sau khi lọc) */
    private List<DebtItemResponse> items;

    /** Tổng hợp nợ theo từng khách hàng / doanh nghiệp */
    private List<CustomerDebtSummaryDto> customerSummaries;

    /** Số khoản nợ đến hạn liên hệ lại hôm nay */
    private int remindersDueTodayCount;

    /**
     * Kết quả đối soát với Báo cáo Doanh thu.
     * null nếu người dùng không lọc theo kỳ trả phòng (chế độ Snapshot toàn bộ).
     */
    private DebtAgingReconciliationDto reconciliation;
}
