package plant.stay.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CashierShiftOpenRequest {
    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal openingCash = BigDecimal.ZERO;

    @Size(max = 2000)
    private String note;
}