package roomi.dev.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "services")
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Service {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true, length = 150)
    private String name;
    
    @Column(name = "unit_price", nullable = false, precision = 12)
    private BigDecimal unitPrice;
    
    @Builder.Default
    @Column(nullable = false, length = 30)
    private String unit = "lan";
    
    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;
}