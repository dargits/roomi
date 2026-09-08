package plant.stay.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HolidayPriceRequest {

    @NotBlank(message = "Tên ngày lễ không được để trống")
    private String holidayName;

    @NotNull(message = "Ngày lễ không được để trống")
    private LocalDate holidayDate;

    @NotNull(message = "ID loại phòng không được để trống")
    private Long roomTypeId;

    @NotNull(message = "Mức giá ngày lễ không được để trống")
    @Min(value = 0, message = "Mức giá không được âm")
    private BigDecimal pricePerNight;

    private Boolean active;
}
