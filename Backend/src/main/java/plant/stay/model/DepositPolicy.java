package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Chính sách tỷ lệ đặt cọc — NCL-11-CN-001 (QTN-18)
 * Cấu hình tỷ lệ % tiền cọc trên tổng tiền phòng dự kiến theo loại phòng.
 * null roomType = áp dụng cho tất cả loại phòng (chính sách mặc định).
 */
@Entity
@Table(name = "deposit_policies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DepositPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // null = chính sách mặc định cho tất cả loại phòng
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id")
    private RoomType roomType;

    // Tỷ lệ phần trăm cọc (0–100)
    @Column(name = "deposit_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal depositPercent;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    // Ghi nhật ký: người tạo/sửa lần cuối
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
