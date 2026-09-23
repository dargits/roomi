package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceSuggestionDto {

    private LocalDate targetDate;
    private String dayOfWeek;
    private long daysRemaining;

    // Căn cứ 1: Số phòng và công suất hiện tại
    private long totalRooms;
    private long occupiedRooms;
    private long vacantRooms;
    private double currentOccupancyRate;

    // Căn cứ 2: Mức lấp đầy tham chiếu (Cùng kỳ năm trước & Ngưỡng cấu hình)
    private Double referenceOccupancyRate; // Mức lấp đầy cùng kỳ năm trước (null nếu chưa đủ 1 năm dữ liệu)
    private double highThreshold;          // Ngưỡng trên do Chủ cấu hình
    private double lowThreshold;           // Ngưỡng dưới do Chủ cấu hình
    private int imminentDaysThreshold;     // Ngưỡng số ngày cận kề

    // Gợi ý hành động
    private String suggestionType;         // INCREASE_PRICE, DECREASE_PRICE_OR_CHANNELS, OPTIMAL
    private String suggestionTitle;
    private String recommendation;

    // Mức độ tin cậy dữ liệu
    private String confidenceLevel;        // HIGH, LOW
    private String confidenceNote;         // "Dữ liệu quá khứ chưa đủ 1 năm..."

    // Trạng thái bỏ qua
    private boolean dismissed;
    private LocalDateTime dismissedAt;

    // Phân rã theo loại phòng để Chủ cơ sở tiện xem xét điều chỉnh giá
    private List<RoomTypeOccupancyDto> roomTypeBreakdown;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomTypeOccupancyDto {
        private Long roomTypeId;
        private String roomTypeName;
        private long totalRooms;
        private long occupiedRooms;
        private long vacantRooms;
        private BigDecimal basePrice;
    }
}
