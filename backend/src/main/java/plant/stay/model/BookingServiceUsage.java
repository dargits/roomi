package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking_service_usages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BookingServiceUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "extra_service_id", nullable = false)
    private ExtraService extraService;

    @Column(nullable = false)
    private Integer quantity;

    // Lưu giá tại thời điểm ghi nhận (snapshot), tránh bị ảnh hưởng khi giá dịch vụ thay đổi
    @Column(name = "unit_price_snapshot", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPriceSnapshot;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
