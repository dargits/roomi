package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "dismissed_price_suggestions", indexes = {
        @Index(name = "idx_dismissed_target_date", columnList = "target_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DismissedPriceSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "target_date", nullable = false, unique = true)
    private LocalDate targetDate;

    @Column(name = "suggestion_type", length = 50)
    private String suggestionType; // INCREASE_PRICE, DECREASE_PRICE_OR_CHANNELS

    @Column(length = 500)
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dismissed_by", referencedColumnName = "id")
    private User dismissedBy;

    @CreationTimestamp
    @Column(name = "dismissed_at", nullable = false, updatable = false)
    private LocalDateTime dismissedAt;
}
