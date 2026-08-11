package roomi.dev.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Getter
@Setter
public class UpdateInvoiceRequest {
    @NotNull(message = "discount không được để trống")
    @DecimalMin(value = "0.0", message = "discount không được nhỏ hơn 0")
    private BigDecimal discount;
}
