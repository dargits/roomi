package plant.stay.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeekendPriceConfigRequest {

    @NotNull(message = "ID loại phòng không được để trống")
    private Long roomTypeId;

    @NotBlank(message = "Danh sách các ngày cuối tuần không được để trống (ví dụ: FRIDAY,SATURDAY,SUNDAY)")
    private String weekendDays;

    @NotNull(message = "Giá ngày cuối tuần không được để trống")
    @Min(value = 0, message = "Giá ngày cuối tuần không được âm")
    private BigDecimal pricePerNight;

    private Boolean active;
}
