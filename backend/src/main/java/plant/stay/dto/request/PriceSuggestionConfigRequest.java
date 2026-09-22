package plant.stay.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceSuggestionConfigRequest {

    @NotNull(message = "Ngưỡng lấp đầy trên không được để trống")
    @DecimalMin(value = "1.0", message = "Ngưỡng trên phải lớn hơn 0%")
    @DecimalMax(value = "100.0", message = "Ngưỡng trên không được vượt quá 100%")
    private Double highOccupancyThreshold;

    @NotNull(message = "Ngưỡng lấp đầy dưới không được để trống")
    @DecimalMin(value = "0.0", message = "Ngưỡng dưới phải từ 0% trở lên")
    @DecimalMax(value = "99.0", message = "Ngưỡng dưới phải nhỏ hơn 100%")
    private Double lowOccupancyThreshold;

    @NotNull(message = "Số ngày cận kề không được để trống")
    @Min(value = 1, message = "Số ngày cận kề tối thiểu là 1 ngày")
    @Max(value = 30, message = "Số ngày cận kề tối đa là 30 ngày")
    private Integer imminentDaysThreshold;
}
