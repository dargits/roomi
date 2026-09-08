package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import plant.stay.model.IncidentSeverity;
import plant.stay.model.IncidentStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomIncidentResponse {
    private Long id;
    private Long roomId;
    private String roomNumber;
    private IncidentSeverity severity;
    private String description;
    private IncidentStatus status;
    private String reportedByName;
    private LocalDateTime reportedAt;
    private String resolvedByName;
    private LocalDateTime resolvedAt;
    private String resolutionNote;
    private Integer affectedBookingsCount;
}
