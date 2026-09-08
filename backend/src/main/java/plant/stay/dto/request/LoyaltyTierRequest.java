package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LoyaltyTierRequest {
    @NotBlank(message = "Tên hạng không được để trống")
    private String name;

    @NotNull(message = "Điểm tối thiểu không được để trống")
    private Integer minPoints;

    private String benefitDescription;
}
