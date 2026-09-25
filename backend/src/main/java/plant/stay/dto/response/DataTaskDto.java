package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataTaskDto {
    private String taskId;
    private String taskType;   // "IMPORT", "EXPORT"
    private String dataType;   // "bookings", "rooms", "guests", etc.
    private String status;     // "QUEUED", "PROCESSING", "COMPLETED", "FAILED"
    private int progressPercent;
    private String statusMessage;
    private String subMessage;
    private int totalRows;
    private int processedRows;
    private int importedCount;
    private int skippedCount;
    private int errorCount;
    private long durationMs;
    private String downloadUrl;
    private String fileName;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    @Builder.Default
    private List<String> details = new ArrayList<>();
}
