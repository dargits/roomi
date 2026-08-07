package roomi.dev.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class SurchargeServiceRequest {
    @NotBlank(message = "name không được để trống")
    private String name;

    private String description;

    @NotNull(message = "unitPrice không được để trống")
    @Positive(message = "unitPrice phải lớn hơn 0")
    private BigDecimal unitPrice;

    private Boolean active;
}
