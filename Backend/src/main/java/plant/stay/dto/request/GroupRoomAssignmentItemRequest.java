package plant.stay.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GroupRoomAssignmentItemRequest {

    @NotNull(message = "Booking cần gán không được để trống")
    private Long bookingId;

    @NotNull(message = "Phòng cần gán không được để trống")
    private Long roomId;
}