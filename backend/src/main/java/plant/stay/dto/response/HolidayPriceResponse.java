package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HolidayPriceResponse {
    private Long id;
    private String holidayName;
    private LocalDate holidayDate;
    private Long roomTypeId;
    private String roomTypeName;
    private BigDecimal pricePerNight;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
