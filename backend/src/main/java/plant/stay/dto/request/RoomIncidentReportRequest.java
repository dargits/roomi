package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import plant.stay.model.IncidentSeverity;

@Data
public class RoomIncidentReportRequest {
    @NotNull(message = "Mã phòng không được để trống")
    private Long roomId;

    @NotNull(message = "Mức độ sự cố không được để trống")
    private IncidentSeverity severity;

    @NotBlank(message = "Mô tả sự cố không được để trống")
    private String description;
}
