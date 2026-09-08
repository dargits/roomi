package plant.stay.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CancellationPolicyRequest {
    private Long roomTypeId; // null = áp dụng chung

    @NotNull(message = "Số giờ hủy miễn phí không được để trống")
    @Min(value = 0)
    private Integer freeCancelHours;

    @NotNull(message = "% phạt không được để trống")
    @DecimalMin(value = "0")
    private BigDecimal penaltyPercent;
}
