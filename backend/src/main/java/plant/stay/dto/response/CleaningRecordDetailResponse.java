package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import plant.stay.model.CleaningRecordStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CleaningRecordDetailResponse {
    private Long id;
    private Long roomId;
    private String roomNumber;
    private Long roomTypeId;
    private String roomTypeName;
    private Long housekeeperId;
    private String housekeeperName;
    private String cleaningType; // CHECKOUT, PERIODIC, MANUAL
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Integer actualDurationMinutes;
    private Integer standardDurationMinutes;
    private CleaningRecordStatus status;
    private Boolean isInterrupted;
    private String interruptionReason;
    private Boolean hasIncident;
    private Integer incidentCount;
    private Integer rejectionCount;
    private String rejectionNote;
    private String inspectedByName;
    private LocalDateTime inspectedAt;

    // Cờ đánh dấu có bị loại trừ khỏi phép tính thời gian trung bình hay không
    private Boolean isExcludedFromAverage;
}
