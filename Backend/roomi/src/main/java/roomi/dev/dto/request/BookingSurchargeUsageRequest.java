package roomi.dev.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BookingSurchargeUsageRequest {

    @NotNull(message = "surchargeServiceId không được để trống")
    private Long surchargeServiceId;

    @NotNull(message = "quantity không được để trống")
    @Min(value = 1, message = "Số lượng phải >= 1")
    private Integer quantity;

    private String note;
}
