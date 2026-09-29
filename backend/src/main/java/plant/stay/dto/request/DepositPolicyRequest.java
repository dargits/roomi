package plant.stay.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Request cấu hình chính sách đặt cọc — NCL-11-CN-001
 */
@Data
public class DepositPolicyRequest {

    // null = chính sách mặc định cho tất cả loại phòng
    private Long roomTypeId;

    @NotNull(message = "Tỷ lệ cọc không được để trống")
    @DecimalMin(value = "0", message = "Tỷ lệ cọc không được âm")
    @DecimalMax(value = "100", message = "Tỷ lệ cọc không được vượt quá 100%")
    private BigDecimal depositPercent;

    /**
     * Ngưỡng tiền phòng dự kiến (đ) — chỉ bắt cọc khi tổng tiền phòng >= ngưỡng.
     * null hoặc 0 = luôn bắt cọc (không có ngưỡng).
     */
    @DecimalMin(value = "0", message = "Ngưỡng tiền không được âm")
    private BigDecimal minimumAmountThreshold;
}

