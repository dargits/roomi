package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "guests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Guest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(unique = true, length = 20)
    private String phone;

    @Column(name = "id_number", length = 20)
    private String idNumber; // CMND/CCCD

    @Column(length = 150)
    private String email;

    @Builder.Default
    @Column(name = "loyalty_points")
    private Integer loyaltyPoints = 0; // Điểm tích lũy

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loyalty_tier_id")
    private LoyaltyTier loyaltyTier; // Hạng thành viên hiện tại

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
