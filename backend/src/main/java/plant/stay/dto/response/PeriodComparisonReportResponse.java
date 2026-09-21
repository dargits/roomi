package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeriodComparisonReportResponse {

    private PeriodInfo currentPeriod;
    private PeriodInfo previousPeriod;
    private PeriodInfo samePeriodLastYear;

    private PeriodMetrics currentMetrics;
    private PeriodMetrics previousMetrics;
    private PeriodMetrics samePeriodLastYearMetrics;

    private MetricComparisonSummary popComparison; // Period-over-Period (Kỳ này vs Kỳ liền trước)
    private MetricComparisonSummary yoyComparison; // Year-over-Year (Kỳ này vs Cùng kỳ năm trước)

    @Builder.Default
    private List<ComparisonTimelinePoint> timeline = new ArrayList<>();

    @Builder.Default
    private List<RoomTypeComparisonDto> roomTypes = new ArrayList<>();

    @Builder.Default
    private List<String> executiveInsights = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodInfo {
        private String label;
        private String from;
        private String to;
        private long days;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodMetrics {
        private BigDecimal roomRevenue;
        private BigDecimal penaltyRevenue;
        private BigDecimal totalRevenue;
        private BigDecimal collectedRevenue;
        private BigDecimal debtRevenue;
        private long totalBookings;
        private long soldRoomNights;
        private long availableRoomNights;
        private double occupancyRate;
        private BigDecimal adr;
        private BigDecimal revpar;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricComparisonSummary {
        private BigDecimal totalRevenueDiff;
        private double totalRevenueGrowthRate;

        private BigDecimal roomRevenueDiff;
        private double roomRevenueGrowthRate;

        private double occupancyRateDiff; // Điểm phần trăm (%pts)
        private double occupancyGrowthRate;

        private BigDecimal adrDiff;
        private double adrGrowthRate;

        private BigDecimal revparDiff;
        private double revparGrowthRate;

        private long soldNightsDiff;
        private double soldNightsGrowthRate;

        private long bookingsDiff;
        private double bookingsGrowthRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComparisonTimelinePoint {
        private int dayIndex; // 1..N
        private String currentDate;
        private BigDecimal currentRevenue;
        private double currentOccupancyRate;

        private String previousDate;
        private BigDecimal previousRevenue;
        private double previousOccupancyRate;

        private String samePeriodLastYearDate;
        private BigDecimal samePeriodLastYearRevenue;
        private double samePeriodLastYearOccupancyRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomTypeComparisonDto {
        private Long roomTypeId;
        private String roomTypeName;
        private BigDecimal basePrice;
        private long totalRooms;

        // Kỳ hiện tại
        private BigDecimal currentRevenue;
        private long currentSoldNights;
        private double currentOccupancyRate;
        private BigDecimal currentAdr;
        private BigDecimal currentRevpar;
        private long currentBookings;

        // Kỳ liền trước (PoP)
        private BigDecimal previousRevenue;
        private long previousSoldNights;
        private double previousOccupancyRate;
        private BigDecimal previousAdr;
        private BigDecimal previousRevpar;
        private long previousBookings;
        private double popRevenueGrowth;
        private double popOccupancyDiff;

        // Cùng kỳ năm trước (YoY)
        private BigDecimal yoyRevenue;
        private long yoySoldNights;
        private double yoyOccupancyRate;
        private BigDecimal yoyAdr;
        private BigDecimal yoyRevpar;
        private long yoyBookings;
        private double yoyRevenueGrowth;
        private double yoyOccupancyDiff;
    }
}
