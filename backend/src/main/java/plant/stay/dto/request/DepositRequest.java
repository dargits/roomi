package plant.stay.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import plant.stay.model.PaymentMethod;

import java.math.BigDecimal;

/**
 * Request thu tiền đặt cọc — NCL-11-CN-002
 */
@Data
public class DepositRequest {

    @NotNull(message = "Số tiền cọc không được để trống")
    @Positive(message = "Số tiền cọc phải lớn hơn 0")
    private BigDecimal amount;

    @NotNull(message = "Hình thức thanh toán không được để trống")
    private PaymentMethod paymentMethod;

    private String note;

    // Lý do thu thiếu (khi amount < requiredAmount) — NCL-11-CN-002-TC-03
    private String shortPaidReason;
}
