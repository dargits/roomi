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
public class WeekendPriceConfigResponse {
    private Long id;
    private Long roomTypeId;
    private String roomTypeName;
    private String weekendDays;
    private BigDecimal pricePerNight;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
