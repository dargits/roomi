package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceSuggestionResponse {

    // Danh sách gợi ý các ngày
    private List<PriceSuggestionDto> suggestions;

    // Tiền điều kiện 1: Đủ ít nhất 3 tháng dữ liệu công suất
    private boolean hasMinimumData;
    private double dataMonthsCount;
    private LocalDate earliestBookingDate;

    // Đánh giá dữ liệu 1 năm cho độ tin cậy
    private boolean hasFullYearData;

    // Tiền điều kiện 2: Đã cấu hình ngưỡng lấp đầy
    private boolean configured;
    private double highOccupancyThreshold;
    private double lowOccupancyThreshold;
    private int imminentDaysThreshold;

    // Thống kê tổng hợp
    private long totalRooms;
    private int totalSuggestionsCount;
    private int increaseCount;
    private int decreaseCount;
    private int dismissedCount;
}
