package plant.stay.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request gia hạn thêm đêm giữa kỳ lưu trú — NCL-04-CN-007 (QTN-22)
 */
@Data
public class ExtendStayRequest {

    @NotNull(message = "Số đêm gia hạn không được để trống")
    @Min(value = 1, message = "Phải gia hạn ít nhất 1 đêm")
    private Integer additionalNights;

    private String note;
}
