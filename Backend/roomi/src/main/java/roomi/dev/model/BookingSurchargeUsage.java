package roomi.dev.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking_surcharge_usages", indexes = {
        @Index(name = "idx_booking_surcharge_usages_booking", columnList = "booking_id"),
        @Index(name = "idx_booking_surcharge_usages_service", columnList = "surcharge_service_id")
})
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class BookingSurchargeUsage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "surcharge_service_id", nullable = false)
    private SurchargeService surchargeService;

    @Column(name = "service_name", nullable = false, length = 150)
    private String serviceName;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotal;

    @Column(length = 1000)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by", nullable = false)
    private User recordedBy;

    @Builder.Default
    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt = LocalDateTime.now();
}
