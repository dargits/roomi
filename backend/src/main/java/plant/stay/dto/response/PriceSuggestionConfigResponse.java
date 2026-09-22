package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceSuggestionConfigResponse {

    private double highOccupancyThreshold;
    private double lowOccupancyThreshold;
    private int imminentDaysThreshold;
    private boolean configured;

    // Trạng thái dữ liệu
    private boolean hasMinimumData;
    private double dataMonthsCount;
    private LocalDate earliestBookingDate;
    private boolean hasFullYearData;
}
