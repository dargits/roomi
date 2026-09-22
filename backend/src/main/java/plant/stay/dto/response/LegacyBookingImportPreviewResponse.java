package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegacyBookingImportPreviewResponse {
    private int totalRows;
    private int validCount;
    private int errorCount;
    private List<LegacyBookingImportErrorDto> errors;
    private List<LegacyBookingRowDto> previewRows;
}
