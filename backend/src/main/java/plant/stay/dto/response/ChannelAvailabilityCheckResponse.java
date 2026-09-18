package plant.stay.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelAvailabilityCheckResponse {
    private Long channelId;
    private String channelName;
    private String channelCode;
    private Long roomTypeId;
    private String roomTypeName;
    private String externalRoomTypeCode;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer totalNights;
    private Integer allocatedRooms;
    private Integer availableRooms; // Số phòng còn lại tối thiểu có thể đặt trong kỳ
    private Boolean isAvailable;    // true nếu còn phòng (availableRooms > 0), false nếu hết phòng
    private String status;          // AVAILABLE, SOLD_OUT, CHANNEL_INACTIVE, ROOM_NOT_MAPPED
    private String message;         // Thông báo giải thích chi tiết
    private List<DailyAvailabilityDto> dailyDetails;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyAvailabilityDto {
        private LocalDate date;
        private String dayOfWeek;
        private Integer allocatedRooms;
        private Long bookingOccupied;
        private Long maintenanceOccupied;
        private Long totalOccupied;
        private Long availableRooms;
        private Boolean isSoldOut;
    }
}
