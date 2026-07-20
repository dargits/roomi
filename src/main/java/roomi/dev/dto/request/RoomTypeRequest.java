package roomi.dev.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class RoomTypeRequest {
    @NotBlank(message = "name không được để trống")
    private String name;

    @NotNull(message = "capacity không được để trống")
    private Integer capacity;

    private String amenities;

    @NotNull(message = "basePrice không được để trống")
    private BigDecimal basePrice;
}
