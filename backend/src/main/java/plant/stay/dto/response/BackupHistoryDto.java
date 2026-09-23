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
public class BackupHistoryDto {
    private Long id;
    private String fileName;
    private Long fileSizeBytes;
    private String formattedSize;
    private String backupType; // "FULL_ZIP", "DATABASE_SQL"
    private String status; // "SUCCESS", "FAILED"
    private Integer tableCount;
    private Long recordCount;
    private String checksum;
    private LocalDateTime createdAt;
    private String createdByName;
    private String note;
}
