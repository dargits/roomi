package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PublicGroupBookingRequestResponse {
    private Long id;
    private String representativeName;
    private String phone;
    private String email;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private String note;
    private String status;
    private String rejectReason;
    private Long convertedGroupBookingId;
    private List<RoomRequest> rooms;
    private LocalDateTime createdAt;

    @Data
    @Builder
    public static class RoomRequest {
        private Long roomTypeId;
        private String roomTypeName;
        private Integer quantity;
    }
}