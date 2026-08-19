package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "stay_declarations",
        uniqueConstraints = @UniqueConstraint(name = "uk_stay_declaration_booking", columnNames = "booking_id")
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StayDeclaration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StayDeclarationStatus status = StayDeclarationStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "completed_by")
    private User completedBy;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}