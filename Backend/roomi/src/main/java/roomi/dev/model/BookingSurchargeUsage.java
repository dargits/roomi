package roomi.dev.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking_surcharge_usages")
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class BookingSurchargeUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne
    @JoinColumn(name = "surcharge_service_id", nullable = false)
    private SurchargeService surchargeService;

    @Column(name = "service_name", nullable = false, length = 150)
    private String serviceName;

    @Column(name = "unit_price", nullable = false, precision = 12)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "line_total", nullable = false, precision = 12)
    private BigDecimal lineTotal;

    private String note;

    @ManyToOne
    @JoinColumn(name = "recorded_by")
    private User recordedBy;

    @Builder.Default
    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt = LocalDateTime.now();
}
