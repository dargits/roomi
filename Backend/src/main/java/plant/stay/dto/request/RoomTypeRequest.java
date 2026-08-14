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
public class RoomTypeRequest {

    @NotBlank(message = "Tên loại phòng không được để trống")
    private String name;

    @NotNull(message = "Sức chứa tối đa không được để trống")
    @Min(value = 1, message = "Sức chứa tối đa phải lớn hơn hoặc bằng 1")
    private Integer maxCapacity;

    @NotNull(message = "Giá cơ bản không được để trống")
    @Min(value = 0, message = "Giá cơ bản không được âm")
    private BigDecimal basePrice;

    private String amenitiesDescription;

    private java.util.List<String> imageUrls;

    private Boolean active;
}
