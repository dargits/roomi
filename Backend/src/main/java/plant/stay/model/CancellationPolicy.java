package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "cancellation_policies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CancellationPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // null = chính sách áp dụng cho tất cả loại phòng
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id")
    private RoomType roomType;

    @Column(name = "free_cancel_hours", nullable = false)
    private Integer freeCancelHours; // Số giờ trước check-in được hủy miễn phí

    @Column(name = "penalty_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal penaltyPercent; // % phạt nếu hủy muộn hơn free cancel
}
