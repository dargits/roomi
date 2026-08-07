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

    // Thuộc tính dùng cho báo cáo công suất hiện tại
    private long totalRooms;
    private long occupiedRooms;
    private double occupancyRate;

    // Thuộc tính dùng cho báo cáo công suất theo dải ngày
    private double averageOccupancy;
    private List<DailyOccupancy> dailyOccupancies;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyOccupancy {
        private String date;
        private long totalRooms;
        private long occupiedRooms;
        private double occupancyRate;
        private List<RoomTypeOccupancy> roomTypeOccupancies;
        private List<RoomOccupancyDetail> roomDetails;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomTypeOccupancy {
        private Long roomTypeId;
        private String roomTypeName;
        private long totalRooms;
        private long occupiedRooms;
        private double occupancyRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomOccupancyDetail {
        private Long roomId;
        private String roomNumber;
        private String roomTypeName;
        private boolean isOccupied;
    }
}