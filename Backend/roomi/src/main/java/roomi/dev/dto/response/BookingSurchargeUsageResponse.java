package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Builder
@Getter
public class BookingSurchargeUsageResponse {
    private Long id;
    private Long bookingId;
    private Long surchargeServiceId;
    private String serviceName;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal lineTotal;
    private String note;
    private Long recordedById;
    private String recordedByName;
    private LocalDateTime recordedAt;
}
