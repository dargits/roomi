package roomi.dev.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity_logs", indexes = {
    @Index(name = "idx_logs_entity", columnList = "entity_name, entity_id")
})
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class ActivityLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false, length = 100)
    private String action;
    
    @Column(name = "entity_name", nullable = false, length = 50)
    private String entityName;
    
    @Column(name = "entity_id", nullable = false)
    private Long entityId;
    
    @Column(columnDefinition = "TEXT")
    private String detail;
    
    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}