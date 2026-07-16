package roomi.dev.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoomRequest {
    @NotNull(message = "roomTypeId không được để trống")
    private Long roomTypeId;

    @NotBlank(message = "roomNumber không được để trống")
    private String roomNumber;

    private String floor;
    private String status;
    private String note;
}
