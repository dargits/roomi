package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import plant.stay.dto.ExtraServiceInventoryItemDto;

@Data
@Builder
public class ExtraServiceResponse {
    private Long id;
    private String name;
    private String description;
    private BigDecimal unitPrice;
    private String unit;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ExtraServiceInventoryItemDto> inventoryItems;
    private Long usageCount;
    private boolean hasBookings;
}

