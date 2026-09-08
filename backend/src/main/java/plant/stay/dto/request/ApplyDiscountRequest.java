package plant.stay.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import plant.stay.model.DiscountType;

import java.math.BigDecimal;

/**
 * Request DTO để Lễ tân áp dụng khoản giảm giá cho hóa đơn.
 * POST /api/v1/invoices/{invoiceId}/discount
 */
@Data
public class ApplyDiscountRequest {

    /**
     * Loại giảm giá: PERCENTAGE (%) hoặc FIXED_AMOUNT (số tiền cụ thể).
     */
    @NotNull(message = "Loại giảm giá không được để trống")
    private DiscountType discountType;

    /**
     * Giá trị giảm:
     *  - Nếu PERCENTAGE: số phần trăm (0 < value <= 100)
     *  - Nếu FIXED_AMOUNT: số tiền >= 0
     */
    @NotNull(message = "Giá trị giảm giá không được để trống")
    @DecimalMin(value = "0", inclusive = false, message = "Giá trị giảm giá phải lớn hơn 0")
    private BigDecimal discountValue;

    /**
     * Lý do giảm giá – bắt buộc nhập (QTN yêu cầu audit trail).
     */
    @NotBlank(message = "Lý do giảm giá là bắt buộc nhập")
    private String reason;
}
