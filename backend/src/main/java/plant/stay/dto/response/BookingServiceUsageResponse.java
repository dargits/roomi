package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import plant.stay.dto.ExtraServiceInventoryItemDto;

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
    private String note;
    private Boolean isSystemMandatory;
    private LocalDateTime createdAt;
    private List<ExtraServiceInventoryItemDto> deductedInventoryItems;
}

