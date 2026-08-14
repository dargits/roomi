package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomTypeResponse {
    private Long id;
    private String name;
    private Integer maxCapacity;
    private BigDecimal basePrice;
    private String amenitiesDescription;
    private java.util.List<String> imageUrls;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
