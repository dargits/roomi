package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "rooms")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_number", nullable = false, unique = true, length = 20)
    private String roomNumber; // VD: "101", "202A"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    @Column(length = 10)
    private String floor; // Tầng

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RoomStatus status = RoomStatus.AVAILABLE;

    @Column(columnDefinition = "TEXT")
    private String notes; // Ghi chú nội bộ

    // NCL-06-CN-NEW: Phân công nhân viên buồng phòng
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_housekeeper_id")
    private User assignedHousekeeper;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    /**
     * Thời điểm phòng được làm sạch hoặc nghiệm thu sạch gần nhất.
     * Dùng để tính chu kỳ dọn định kỳ khi phòng để trống lâu ngày.
     */
    @Column(name = "last_cleaned_at")
    private LocalDateTime lastCleanedAt;

    /**
     * Lý do phòng chuyển sang trạng thái cần dọn (DIRTY):
     * - CHECKOUT: Khách vừa trả phòng
     * - PERIODIC_VACANT: Phòng để trống lâu ngày theo chu kỳ dọn định kỳ
     * - MANUAL: Nhân viên / Quản lý đánh dấu thủ công
     * - INCIDENT: Phát sinh sự cố kỹ thuật hoặc phòng ốc
     */
    @Column(name = "cleaning_reason", length = 50)
    private String cleaningReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
