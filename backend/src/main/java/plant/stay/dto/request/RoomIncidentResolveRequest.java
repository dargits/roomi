package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoomIncidentResolveRequest {
    @NotBlank(message = "Ghi chú xử lý không được để trống")
    private String resolutionNote;
}
