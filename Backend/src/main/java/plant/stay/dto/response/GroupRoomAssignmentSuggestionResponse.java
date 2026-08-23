package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class GroupRoomAssignmentSuggestionResponse {
    private Long groupBookingId;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private List<AssignmentLine> assignments;

    @Data
    @Builder
    public static class AssignmentLine {
        private Long bookingId;
        private Long roomTypeId;
        private String roomTypeName;
        private List<RoomOption> availableRooms;
    }

    @Data
    @Builder
    public static class RoomOption {
        private Long id;
        private String roomNumber;
        private String floor;
    }
}