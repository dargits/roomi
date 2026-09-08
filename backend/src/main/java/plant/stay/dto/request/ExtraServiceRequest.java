package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class ExtraServiceRequest {
    @NotBlank(message = "Tên dịch vụ không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Đơn giá không được để trống")
    @Min(value = 0, message = "Đơn giá không được âm")
    private BigDecimal unitPrice;

    @NotBlank(message = "Đơn vị tính không được để trống")
    private String unit;

    private Boolean active;
}
