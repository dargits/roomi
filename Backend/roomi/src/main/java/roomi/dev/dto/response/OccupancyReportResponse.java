package roomi.dev.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OccupancyReportResponse {
    
    private double averageOccupancy;
    private List<DailyOccupancy> dailyOccupancies;

    // Lớp DailyOccupancy phải là 'public static' thì hàm Builder mới hoạt động đúng
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyOccupancy {
        private String date;
        private double occupancyRate;
    }
}