package plant.stay.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BulkCheckInRequest {
    @NotEmpty(message = "Danh sách phòng check-in không được để trống")
    @Valid
    private List<BulkCheckInRoomRequest> rooms;
}
