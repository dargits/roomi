package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import plant.stay.model.RoomStatus;

@Data
public class RoomRequest {
    @NotBlank(message = "Số phòng không được để trống")
    private String roomNumber;

    @NotNull(message = "Loại phòng không được để trống")
    private Long roomTypeId;

    private String floor;

    private RoomStatus status;

    private String notes;
}
