package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "channel_calendar_sync_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelCalendarSyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;

    @Column(name = "channel_name", nullable = false, length = 100)
    private String channelName;

    @Column(name = "room_type_name", nullable = false, length = 100)
    private String roomTypeName;

    @Column(name = "triggered_by", nullable = false, length = 50)
    private String triggeredBy; // SCHEDULED_CYCLE, BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED, ROOM_MAINTENANCE, MANUAL_REFRESH, TOKEN_REGENERATED

    @Column(name = "blocked_periods_count", nullable = false)
    @Builder.Default
    private Integer blockedPeriodsCount = 0; // Số khoảng thời gian đã chặn trong tệp lịch

    @Column(name = "blocked_summary", columnDefinition = "TEXT")
    private String blockedSummary; // Tóm tắt chi tiết các khoảng thời gian bị chặn (vd: "2026-09-20 -> 2026-09-23")

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "SUCCESS"; // SUCCESS, ERROR

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "synced_at", nullable = false, updatable = false)
    private LocalDateTime syncedAt;
}
