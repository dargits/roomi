package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class BookingServiceUsageResponse {
    private Long id;
    private Long bookingId;
    private Long extraServiceId;
    private String serviceName;
    private Integer quantity;
    private BigDecimal unitPriceSnapshot;
    private BigDecimal total;
    private LocalDateTime createdAt;
}
