package roomi.dev.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalTime;

@Entity
@Table(name = "property_settings")
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class PropertySettings {
    @Id
    @Builder.Default
    private Long id = 1L;
    
    @Column(name = "property_name", nullable = false, length = 150)
    private String propertyName;
    
    private String address;
    
    @Column(length = 20)
    private String phone;
    
    @Builder.Default
    @Column(name = "default_checkin_time", nullable = false)
    private LocalTime defaultCheckinTime = LocalTime.of(14, 0);
    
    @Builder.Default
    @Column(name = "default_checkout_time", nullable = false)
    private LocalTime defaultCheckoutTime = LocalTime.of(12, 0);
    
    @Builder.Default
    @Column(name = "free_cancel_hours", nullable = false)
    private Integer freeCancelHours = 24;
    
    @Builder.Default
    @Column(name = "cancel_fee_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal cancelFeePercent = BigDecimal.ZERO;
}