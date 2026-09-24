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

    /**
     * Cấu hình gợi ý điều chỉnh giá theo công suất dự báo:
     * - priceSuggestionHighThreshold: Ngưỡng lấp đầy trên (%), gợi ý cân nhắc tăng giá (mặc định 80.0%)
     * - priceSuggestionLowThreshold: Ngưỡng lấp đầy dưới (%), gợi ý cân nhắc giảm giá hoặc mở thêm kênh (mặc định 30.0%)
     * - priceSuggestionImminentDays: Số ngày cận kề để xét gợi ý giảm giá (mặc định 7 ngày)
     * - priceSuggestionConfigured: Đánh dấu Chủ cơ sở đã cấu hình ngưỡng lấp đầy hay chưa
     */
    @Column(name = "price_suggestion_high_threshold")
    @Builder.Default
    private Double priceSuggestionHighThreshold = 80.0;

    @Column(name = "price_suggestion_low_threshold")
    @Builder.Default
    private Double priceSuggestionLowThreshold = 30.0;

    @Column(name = "price_suggestion_imminent_days")
    @Builder.Default
    private Integer priceSuggestionImminentDays = 7;

    @Column(name = "price_suggestion_configured")
    @Builder.Default
    private Boolean priceSuggestionConfigured = true;

    /**
     * Cấu hình Sao lưu tự động toàn bộ hệ thống:
     * - autoBackupEnabled: Bật/tắt tự động sao lưu hàng ngày.
     * - autoBackupTime: Khung giờ chạy sao lưu tự động hàng ngày (mặc định 02:00 sáng).
     * - backupRetentionDays: Số ngày lưu trữ bản sao lưu trên máy chủ trước khi tự dọn dẹp (mặc định 30 ngày).
     * - lastBackupAt: Thời điểm tạo bản sao lưu gần nhất.
     * - lastBackupStatus: Trạng thái của lần sao lưu gần nhất.
     */
    @Column(name = "auto_backup_enabled")
    @Builder.Default
    private Boolean autoBackupEnabled = true;

    @Column(name = "auto_backup_time")
    @Builder.Default
    private LocalTime autoBackupTime = LocalTime.of(2, 0);

    @Column(name = "backup_retention_days")
    @Builder.Default
    private Integer backupRetentionDays = 30;

    @Column(name = "last_backup_at")
    private LocalDateTime lastBackupAt;

    @Column(name = "last_backup_status")
    private String lastBackupStatus;

    /**
     * Danh sách Google API Key dùng cho tính năng AI.
     * Mỗi key nằm trên một dòng (phân cách bằng ký tự xuống dòng '\n').
     * Lưu dưới dạng TEXT để hỗ trợ nhiều key.
     */
    @Column(name = "google_api_keys", columnDefinition = "TEXT")
    private String googleApiKeys;

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
