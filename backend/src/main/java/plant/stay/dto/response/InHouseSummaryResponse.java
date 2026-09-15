package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InHouseSummaryResponse {
    private int totalRooms;
    private int totalOccupants;
    private int checkoutTodayCount;
    private int debtCount;
    private BigDecimal totalDebtAmount;
}
