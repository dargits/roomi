package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "room_cleaning_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomCleaningRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "housekeeper_id")
    private User housekeeper;

    /**
     * Phân loại dọn dẹp:
     * - CHECKOUT: Dọn sau khi khách trả phòng
     * - PERIODIC: Dọn định kỳ phòng trống lâu ngày
     * - MANUAL: Dọn đột xuất / theo yêu cầu
     */
    @Column(name = "cleaning_type", length = 30)
    private String cleaningType;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * Thời gian dọn thực tế tính bằng phút (từ startedAt đến completedAt).
     */
    @Column(name = "actual_duration_minutes")
    private Integer actualDurationMinutes;

    /**
     * Định mức thời gian dọn của loại phòng này tại thời điểm dọn (phút).
     */
    @Column(name = "standard_duration_minutes")
    private Integer standardDurationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    @Builder.Default
    private CleaningRecordStatus status = CleaningRecordStatus.IN_PROGRESS;

    /**
     * Đánh dấu phòng bị gián đoạn trong khi dọn (thiếu đồ vải, thợ bảo trì, khách quay lại đột xuất...).
     * Nếu true -> Loại trừ khỏi việc tính toán thời gian trung bình.
     */
    @Column(name = "is_interrupted")
    @Builder.Default
    private Boolean isInterrupted = false;

    @Column(name = "interruption_reason", columnDefinition = "TEXT")
    private String interruptionReason;

    /**
     * Đánh dấu có báo sự cố kỹ thuật / trang thiết bị trong khi dọn phòng.
     * Nếu true -> Loại trừ khỏi việc tính toán thời gian trung bình.
     */
    @Column(name = "has_incident")
    @Builder.Default
    private Boolean hasIncident = false;

    @Column(name = "incident_count")
    @Builder.Default
    private Integer incidentCount = 0;

    /**
     * Số lần bị trả lại do kiểm tra nghiệm thu không đạt yêu cầu.
     */
    @Column(name = "rejection_count")
    @Builder.Default
    private Integer rejectionCount = 0;

    @Column(name = "rejection_note", columnDefinition = "TEXT")
    private String rejectionNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspected_by")
    private User inspectedBy;

    @Column(name = "inspected_at")
    private LocalDateTime inspectedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
