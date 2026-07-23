package roomi.dev.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BookingSurchargeUsageRequest {
    @NotNull(message = "surchargeServiceId không được để trống")
    private Long surchargeServiceId;

    @NotNull(message = "quantity không được để trống")
    @Positive(message = "quantity phải lớn hơn 0")
    private Integer quantity;

    private String note;
}
