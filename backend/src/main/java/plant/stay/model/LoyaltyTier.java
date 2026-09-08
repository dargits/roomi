package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "loyalty_tiers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyTier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name; // VD: Bạc, Vàng, Bạch Kim

    @Column(nullable = false)
    private Integer minPoints; // Điểm tối thiểu để đạt hạng

    @Column(columnDefinition = "TEXT")
    private String benefitDescription; // Mô tả quyền lợi
}
