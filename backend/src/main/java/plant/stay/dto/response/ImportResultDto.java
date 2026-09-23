package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportResultDto {
    private boolean success;
    private String message;
    private int totalRows;
    private int importedCount;
    private int skippedCount;
    private int errorCount;
    private long durationMs;
    @Builder.Default
    private List<String> details = new ArrayList<>();
}
