package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response trả về thông tin chính sách đặt cọc
 */
@Data
@Builder
public class DepositPolicyResponse {
    private Long id;
    private Long roomTypeId;
    private String roomTypeName;
    private BigDecimal depositPercent;
    /** Ngưỡng tiền phòng dự kiến (đ) để bắt cọc. null/0 = luôn bắt cọc. */
    private BigDecimal minimumAmountThreshold;
    private Boolean active;
    private String updatedByName;
    private BigDecimal previousPercent;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

