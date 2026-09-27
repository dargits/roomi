package plant.stay.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoyaltyTierRequest {
    @NotBlank(message = "Tên hạng không được để trống")
    @Size(max = 100, message = "Tên hạng không được vượt quá 100 ký tự")
    private String name;

    @NotNull(message = "Điểm tối thiểu không được để trống")
    @Min(value = 0, message = "Điểm tối thiểu không được âm")
    private Integer minPoints;

    @Min(value = 0, message = "Phần trăm giảm không được âm")
    @Max(value = 100, message = "Phần trăm giảm không được vượt quá 100%")
    private Double discountPercent;

    @Size(max = 2000, message = "Mô tả quyền lợi không được vượt quá 2000 ký tự")
    private String benefitDescription;
}
