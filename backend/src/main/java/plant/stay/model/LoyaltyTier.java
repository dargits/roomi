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

    @Column(nullable = false)
    @Builder.Default
    private Double discountPercent = 0.0; // % Giảm giá cấu hình cho hạng này (VD: 5.0, 10.0, 15.0)

    @Column(columnDefinition = "TEXT")
    private String benefitDescription; // Mô tả quyền lợi
}
