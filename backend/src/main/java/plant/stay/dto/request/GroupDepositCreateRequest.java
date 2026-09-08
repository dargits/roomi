package plant.stay.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import plant.stay.model.PaymentMethod;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupDepositCreateRequest {

    @NotNull(message = "Số tiền cọc không được để trống")
    @Positive(message = "Số tiền cọc phải lớn hơn 0")
    private BigDecimal amount;

    @NotNull(message = "Phương thức thanh toán cọc không được để trống")
    private PaymentMethod paymentMethod;

    private String note;
}
