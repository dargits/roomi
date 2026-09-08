package plant.stay.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class InvoiceAdjustRequest {
    @NotNull(message = "Tổng tiền không được để trống")
    @DecimalMin(value = "0", message = "Tổng tiền phải >= 0")
    private BigDecimal discountAmount;

    private String note;
}
