package plant.stay.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import plant.stay.model.PaymentMethod;

import java.math.BigDecimal;

@Data
public class PaymentRequest {
    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "0", inclusive = false, message = "Số tiền phải lớn hơn 0")
    private BigDecimal amount;

    @NotNull(message = "Phương thức thanh toán không được để trống")
    private PaymentMethod method;

    private String note;
}
