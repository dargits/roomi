package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_name", nullable = false, length = 100)
    private String entityName; // VD: "Booking", "Room", "Invoice"

    @Column(name = "entity_id")
    private Long entityId;

    @Column(nullable = false, length = 100)
    private String action; // VD: "CHECK_IN", "CANCEL", "MARK_CLEAN"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor; // Người thực hiện (null nếu là hệ thống)

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "detail_json", columnDefinition = "TEXT")
    private String detailJson; // JSON mô tả thay đổi
}
