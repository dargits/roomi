package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InventoryItemResponse {
    private Long id;
    private String name;
    private String unit;
    private Integer quantityOnHand;
    private Integer lowStockThreshold;
    private boolean lowStock; // true nếu tồn <= ngưỡng
    private LocalDateTime updatedAt;
}
