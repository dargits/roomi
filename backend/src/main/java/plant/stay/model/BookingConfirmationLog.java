package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Nhật ký lưu vết mỗi lần gửi / kết xuất bản xác nhận đặt phòng cho khách.
 * Lưu lại thời điểm, kênh gửi, người thực hiện, người nhận và trạng thái để phục vụ tra cứu & gửi lại.
 */
@Entity
@Table(name = "booking_confirmation_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingConfirmationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 30)
    private ConfirmationChannel channel;

    @Column(name = "recipient", length = 255)
    private String recipient; // Email, số điện thoại hoặc định danh người nhận

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sent_by")
    private User sentBy; // Nhân viên thực hiện gửi / kết xuất

    @Column(name = "status", nullable = false, length = 30)
    private String status; // SUCCESS, FAILED

    @Column(name = "note", columnDefinition = "TEXT")
    private String note; // Ghi chú bổ sung hoặc chi tiết lỗi

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @PrePersist
    public void prePersist() {
        if (this.sentAt == null) {
            this.sentAt = LocalDateTime.now();
        }
    }
}
