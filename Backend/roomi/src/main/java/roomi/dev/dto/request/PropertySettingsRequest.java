package roomi.dev.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalTime;

@Getter
@Setter
public class PropertySettingsRequest {

    @NotBlank(message = "Tên cơ sở không được để trống")
    private String propertyName;

    private String address;
    private String phone;

    private LocalTime defaultCheckinTime;
    private LocalTime defaultCheckoutTime;
    private Integer freeCancelHours;
    private BigDecimal cancelFeePercent;
}
