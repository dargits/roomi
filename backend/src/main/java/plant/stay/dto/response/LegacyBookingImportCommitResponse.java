package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegacyBookingImportCommitResponse {
    private Long importLogId;
    private int totalRows;
    private int successCount;
    private int errorCount;
    private String message;
}
