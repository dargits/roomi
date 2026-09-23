package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestoreSummaryDto {
    private boolean success;
    private String message;
    private int statementsExecuted;
    private int tablesRestored;
    private long durationMs;
    private LocalDateTime restoredAt;
    private String fileName;
}
