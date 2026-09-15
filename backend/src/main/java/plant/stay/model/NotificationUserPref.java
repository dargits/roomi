package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_user_prefs",
    uniqueConstraints = @UniqueConstraint(name = "uq_user_type", columnNames = {"user_id", "type"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationUserPref {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 60)
    private NotificationType type;

    @Builder.Default
    @Column(nullable = false)
    private Boolean enabled = true;
}
