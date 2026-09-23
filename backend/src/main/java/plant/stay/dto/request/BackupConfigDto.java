package plant.stay.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BackupConfigDto {
    private Boolean autoBackupEnabled;
    private String autoBackupTime; // "HH:mm" e.g. "02:00"
    private Integer backupRetentionDays;
    private LocalDateTime lastBackupAt;
    private String lastBackupStatus;
    private Integer totalBackups;
    private Long totalStorageBytes;
    private String formattedTotalStorage;
}
