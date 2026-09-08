package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Nhật ký va chạm đồng thời — NCL-03-CN-007 (QTN-21)
 * Ghi lại mỗi lần một thao tác gán phòng bị từ chối do race condition.
 */
@Entity
@Table(name = "concurrency_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConcurrencyLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Phòng bị va chạm
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    // Booking bị từ chối (nếu có)
    @Column(name = "rejected_booking_id")
    private Long rejectedBookingId;

    // Booking đang chiếm phòng (gây xung đột)
    @Column(name = "conflicting_booking_id")
    private Long conflictingBookingId;

    // Người thao tác bị từ chối
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    // Loại thao tác: ASSIGN_ROOM, EXTEND_STAY, UPGRADE_ROOM, STRESS_TEST
    @Column(name = "action_type", length = 50)
    private String actionType;

    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    // Đây có phải là kết quả từ stress test không (NCL-03-CN-008)
    @Column(name = "from_stress_test")
    @Builder.Default
    private Boolean fromStressTest = false;

    // Session/batch ID nếu chạy từ stress test
    @Column(name = "test_session_id", length = 100)
    private String testSessionId;

    @CreationTimestamp
    @Column(name = "occurred_at", updatable = false)
    private LocalDateTime occurredAt;
}
