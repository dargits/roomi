package roomi.dev.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class InvoiceAdjustmentRequest {

    @NotBlank(message = "Lý do điều chỉnh không được để trống")
    private String adjustmentReason;

    private BigDecimal roomChargeAdjustment; // Có thể âm hoặc dương (hoặc null nếu không đổi)
    private BigDecimal serviceChargeAdjustment; // Có thể âm hoặc dương (hoặc null nếu không đổi)
    private BigDecimal discountAdjustment; // Có thể âm hoặc dương (hoặc null nếu không đổi)
}
