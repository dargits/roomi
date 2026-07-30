package roomi.dev.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class PaymentRequest {

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền thanh toán phải lớn hơn hoặc bằng 1,000 VNĐ")
    private BigDecimal amount;

    @NotBlank(message = "Phương thức thanh toán không được để trống (CASH, BANK_TRANSFER)")
    private String method;
}
