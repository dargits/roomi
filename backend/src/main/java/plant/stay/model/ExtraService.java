package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "extra_service")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExtraService {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;           // VD: "Ăn sáng", "Đưa đón", "Giặt là"
    
    private String description;
    
    @Column(nullable = false)
    private BigDecimal unitPrice;  // đơn giá
    
    @Column(nullable = false)
    private String unit;           // "lượt", "phần", "kg"...
    
    @Builder.Default
    private boolean active = true;        // còn bán hay ngưng

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
