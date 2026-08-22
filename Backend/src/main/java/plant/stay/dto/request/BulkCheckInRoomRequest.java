package plant.stay.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BulkCheckInRoomRequest {
    @NotNull(message = "Mã đặt phòng không được để trống")
    private Long bookingId;

    @Valid
    private List<GuestCheckInDto> guests;
}
