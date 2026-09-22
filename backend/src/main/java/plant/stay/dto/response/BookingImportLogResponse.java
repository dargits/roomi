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
public class BookingImportLogResponse {
    private Long id;
    private String fileName;
    private Integer totalRows;
    private Integer successCount;
    private Integer errorCount;
    private String status;
    private Long importedById;
    private String importedByName;
    private LocalDateTime importedAt;
    private String notes;
}
