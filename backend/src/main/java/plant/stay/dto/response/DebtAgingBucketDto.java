package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Thống kê một nhóm tuổi nợ (aging bucket) trong Báo cáo Tuổi nợ.
 */
@Data
@Builder
public class DebtAgingBucketDto {

    /** Mã nhóm: CURRENT, OVERDUE_UNDER_15, OVERDUE_15_TO_30, OVERDUE_OVER_30 */
    private String bucketKey;

    /** Tên hiển thị: "Trong hạn", "Quá hạn < 15 ngày", "Từ 15 - 30 ngày", "Trên 30 ngày" */
    private String bucketName;

    /** Mức độ rủi ro: SUCCESS, WARNING, DANGER, CRITICAL */
    private String severity;

    /** Số hóa đơn nằm trong nhóm này */
    private int invoiceCount;

    /** Tổng dư nợ của nhóm này */
    private BigDecimal totalAmount;

    /** Tỷ trọng % của nhóm trên tổng dư nợ toàn hệ thống */
    private double percentage;
}
