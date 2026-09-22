package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CleaningStandardResponse {
    private Long roomTypeId;
    private String roomTypeName;
    private Integer standardCheckoutCleaningMinutes;
    private Integer standardPeriodicCleaningMinutes;
    private Integer totalRooms;
}
