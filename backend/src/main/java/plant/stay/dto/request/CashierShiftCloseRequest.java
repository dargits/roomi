package plant.stay.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CashierShiftCloseRequest {
    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal actualCash;

    @Size(max = 2000)
    private String explanation;
}