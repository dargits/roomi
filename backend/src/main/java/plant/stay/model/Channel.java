package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "channels")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Channel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name; // Ví dụ: "Airbnb - Deluxe Đôi", "Booking.com - Standard"

    @Column(name = "channel_code", nullable = false, length = 50)
    @Builder.Default
    private String channelCode = "AIRBNB"; // AIRBNB, BOOKING_COM, AGODA, TRIP_COM, OTHER

    @Column(name = "external_calendar_url", length = 500)
    private String externalCalendarUrl; // Đường dẫn tệp lịch mà kênh cung cấp (vd: iCal link từ Airbnb/Booking.com)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id")
    private RoomType roomType;

    @Column(name = "allocated_rooms")
    @Builder.Default
    private Integer allocatedRooms = 1; // Số phòng phân bổ cho kênh này (hoặc tổng phân bổ)

    @Column(name = "feed_token", nullable = false, unique = true, length = 128)
    private String feedToken; // Mã token bảo mật khó đoán dùng làm đường dẫn tệp lịch (.ics)

    @Column(name = "sync_interval_minutes", nullable = false)
    @Builder.Default
    private Integer syncIntervalMinutes = 15; // Chu kỳ cập nhật định kỳ (phút)

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Lob
    @Column(name = "cached_ics_content", columnDefinition = "LONGTEXT")
    private String cachedIcsContent; // Nội dung tệp .ics được sinh sẵn để phản hồi tức thì với độ trễ thấp nhất

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt; // Lần sinh tệp gần nhất

    @Column(name = "last_sync_status", length = 20)
    @Builder.Default
    private String lastSyncStatus = "NEVER_SYNCED"; // SUCCESS, ERROR, NEVER_SYNCED, WARNING

    @Column(name = "last_sync_error_message", columnDefinition = "TEXT")
    private String lastSyncErrorMessage; // Chi tiết lỗi của lần đồng bộ gần nhất nếu có

    @Column(name = "last_success_synced_at")
    private LocalDateTime lastSuccessSyncedAt; // Lần đồng bộ thành công gần nhất

    @Column(name = "consecutive_failures")
    @Builder.Default
    private Integer consecutiveFailures = 0; // Số lần đồng bộ thất bại liên tiếp

    @Column(name = "last_blocked_periods_count")
    @Builder.Default
    private Integer lastBlockedPeriodsCount = 0; // Số khoảng thời gian đã chặn ở lần sinh gần nhất

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
