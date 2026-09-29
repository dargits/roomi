package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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

    @Column(name = "hours_after_confirmation")
    @Builder.Default
    private Integer hoursAfterConfirmation = 24; // Khoảng thời gian (giờ) bắt đầu tính phí hủy sau khi lễ tân xác nhận

    @Column(name = "penalty_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal penaltyPercent; // % phí phạt tính trên số tiền đặt cọc

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @Column(name = "previous_percent", precision = 5, scale = 2)
    private BigDecimal previousPercent; // Lưu giá trị cũ để audit

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
