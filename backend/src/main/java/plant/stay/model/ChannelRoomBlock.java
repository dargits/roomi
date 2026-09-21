package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "channel_room_blocks", indexes = {
    @Index(name = "idx_crb_channel", columnList = "channel_id"),
    @Index(name = "idx_crb_dates", columnList = "start_date, end_date"),
    @Index(name = "idx_crb_room", columnList = "room_id"),
    @Index(name = "idx_crb_uid", columnList = "channel_id, external_uid")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelRoomBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    // Phòng vật lý được gán tạm thời để chặn trực tiếp trên ma trận sơ đồ phòng
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    // UID của sự kiện (VEVENT) trong tệp iCal (.ics) từ kênh OTA
    @Column(name = "external_uid", nullable = false, length = 255)
    private String externalUid;

    // Ngày bắt đầu chặn (tương ứng ngày nhận phòng / DTSTART)
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    // Ngày kết thúc chặn (tương ứng ngày trả phòng / DTEND theo chuẩn RFC 5545)
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    // Tiêu đề sự kiện từ kênh (vd: "Airbnb (Not available)", "Reserved")
    @Column(length = 255)
    private String summary;

    // Trạng thái lượt chặn: BLOCKED (đang chặn), CONVERTED (đã chuyển thành đặt phòng), CANCELLED (đã gỡ)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "BLOCKED";

    // Liên kết tới đặt phòng chính thức nếu lễ tân đã chuyển đổi
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "converted_booking_id")
    private Booking convertedBooking;

    // Đánh dấu nếu lượt chặn này vượt quá số phòng phân bổ (allocatedRooms) của kênh
    @Column(name = "is_excess", nullable = false)
    @Builder.Default
    private Boolean isExcess = false;

    // Thông điệp cảnh báo nếu có lỗi phân bổ hoặc xung đột
    @Column(name = "warning_message", columnDefinition = "TEXT")
    private String warningMessage;

    // Lý do từ chối lượt chặn nếu lễ tân từ chối
    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
