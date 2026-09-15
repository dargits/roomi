package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_role_defaults",
    uniqueConstraints = @UniqueConstraint(name = "uq_role_type", columnNames = {"role", "type"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationRoleDefault {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 60)
    private NotificationType type;

    /** true = khong cho nguoi dung tat duoc */
    @Builder.Default
    @Column(name = "is_mandatory", nullable = false)
    private Boolean isMandatory = false;
}
