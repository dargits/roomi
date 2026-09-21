package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "hotel_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HotelSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_name", nullable = false)
    private String propertyName;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(length = 20)
    private String phone;

    private String email;

    @Column(name = "default_checkin_time", nullable = false)
    private LocalTime defaultCheckinTime;

    @Column(name = "default_checkout_time", nullable = false)
    private LocalTime defaultCheckoutTime;

    @Column(name = "home_image")
    private String homeImage;

    /**
     * Ngưỡng giảm giá (số tiền tuyệt đối, sau khi đã tính ra calculatedAmount).
     * Nếu calculatedAmount >= ngưỡng này → chuyển trạng thái
     * PENDING_DISCOUNT_APPROVAL, cần OWNER duyệt.
     * Nếu NULL → luôn tự động duyệt (không cần OWNER phê duyệt).
     */
    @Column(name = "discount_approval_threshold", precision = 12, scale = 2)
    private BigDecimal discountApprovalThreshold;

    @Column(name = "reminder_email_enabled")
    @Builder.Default
    private Boolean reminderEmailEnabled = true;

    @Column(name = "reminder_morning_time")
    private LocalTime reminderMorningTime;

    @Column(name = "lost_item_retention_days")
    @Builder.Default
    private Integer lostItemRetentionDays = 30;

    /**
     * Cấu hình dọn định kỳ cho phòng trống dài ngày:
     * - periodicCleaningEnabled: Cho phép hệ thống tự động đưa phòng trống lâu ngày vào danh sách cần dọn.
     * - periodicCleaningDays: Số ngày phòng không có khách sẽ chuyển sang trạng thái DIRTY (mặc định 5 ngày).
     */
    @Column(name = "periodic_cleaning_enabled")
    @Builder.Default
    private Boolean periodicCleaningEnabled = true;

    @Column(name = "periodic_cleaning_days")
    @Builder.Default
    private Integer periodicCleaningDays = 5;

    /**
     * Thời gian không thao tác tối đa trước khi hệ thống tự động kết thúc phiên đăng nhập (phút).
     * NCL-10-CN-007: Hệ thống tự kết thúc phiên không thao tác quá khoảng thời gian do Chủ cơ sở cấu hình.
     */
    @Column(name = "session_timeout_minutes")
    @Builder.Default
    private Integer sessionTimeoutMinutes = 120;

    /**
     * Giới hạn số phiên đăng nhập đồng thời tối đa cho mỗi tài khoản.
     * 0: Không giới hạn (cho phép nhiều thiết bị đăng nhập đồng thời).
     * 1: Chế độ phiên duy nhất (đăng nhập máy mới sẽ tự động đăng xuất máy cũ).
     * > 1: Giới hạn tối đa N thiết bị cùng lúc.
     */
    @Column(name = "max_concurrent_sessions")
    @Builder.Default
    private Integer maxConcurrentSessions = 0;

    /**
     * Thời hạn hiệu lực tối đa của một phiên làm việc (giờ) kể từ lúc đăng nhập (Absolute Expiry).
     * Mặc định 24 giờ (1 ngày).
     */
    @Column(name = "max_session_lifetime_hours")
    @Builder.Default
    private Integer maxSessionLifetimeHours = 24;

    /**
     * NCL-09-CN-008: Cho phép khách xem và tải hóa đơn trực tuyến trên cổng công khai.
     * Cơ sở tắt được chức năng này trong cấu hình nếu không muốn mở ra ngoài.
     */
    @Column(name = "public_invoice_lookup_enabled")
    @Builder.Default
    private Boolean publicInvoiceLookupEnabled = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by", referencedColumnName = "id")
    private User updatedBy;
}
