package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalTime;

@Builder
@Getter
public class PropertySettingsResponse {
    private Long id;
    private String propertyName;
    private String address;
    private String phone;
    private LocalTime defaultCheckinTime;
    private LocalTime defaultCheckoutTime;
    private Integer freeCancelHours;
    private BigDecimal cancelFeePercent;
}
