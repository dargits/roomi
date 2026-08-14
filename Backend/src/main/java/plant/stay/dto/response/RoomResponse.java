package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import plant.stay.model.RoomStatus;

import java.time.LocalDateTime;

@Data
@Builder
public class RoomResponse {
    private Long id;
    private String roomNumber;
    private Long roomTypeId;
    private String roomTypeName;
    private String floor;
    private RoomStatus status;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
