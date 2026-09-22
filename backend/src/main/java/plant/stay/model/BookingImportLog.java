package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "booking_import_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingImportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "total_rows", nullable = false)
    private Integer totalRows;

    @Column(name = "success_count", nullable = false)
    private Integer successCount;

    @Column(name = "error_count", nullable = false)
    private Integer errorCount;

    @Column(name = "status", nullable = false, length = 30)
    private String status; // "SUCCESS", "REJECTED"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imported_by", nullable = false)
    private User importedBy;

    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
