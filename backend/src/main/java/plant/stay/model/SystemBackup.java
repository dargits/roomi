package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "system_backups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemBackup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false, unique = true)
    private String fileName;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "backup_type", length = 30)
    private String backupType; // "FULL_ZIP", "DATABASE_SQL"

    @Column(name = "status", length = 30)
    private String status; // "SUCCESS", "FAILED", "IN_PROGRESS"

    @Column(name = "table_count")
    private Integer tableCount;

    @Column(name = "record_count")
    private Long recordCount;

    @Column(name = "checksum", length = 100)
    private String checksum; // SHA-256

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @Column(name = "note", length = 1000)
    private String note;
}
