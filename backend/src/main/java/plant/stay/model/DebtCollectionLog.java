package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Nhật ký các lần kế toán liên hệ đòi nợ cho một khoản công nợ.
 * Mỗi bản ghi là một lần tương tác: gọi điện, gửi email, gặp trực tiếp,...
 */
@Entity
@Table(name = "debt_collection_logs",
       indexes = @Index(name = "idx_dcl_debt_id_date", columnList = "debt_approval_request_id, contact_date DESC"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DebtCollectionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Khoản nợ được liên hệ đòi */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debt_approval_request_id", nullable = false)
    private DebtApprovalRequest debtApprovalRequest;

    /** Thời điểm liên hệ */
    @Column(name = "contact_date", nullable = false)
    private LocalDateTime contactDate;

    /**
     * Hình thức liên hệ: PHONE, EMAIL, ZALO, IN_PERSON, SMS, OTHER
     */
    @Column(name = "contact_method", nullable = false, length = 20)
    private String contactMethod;

    /**
     * Kết quả liên hệ: PROMISED_TO_PAY, NO_ANSWER, COMPLAINT, PENDING_APPROVAL, OTHER
     */
    @Column(name = "contact_result", length = 50)
    private String contactResult;

    /** Nội dung trao đổi / ghi chú chi tiết */
    @Column(columnDefinition = "TEXT")
    private String notes;

    /** Ngày khách hẹn chuyển khoản / thanh toán (tùy chọn) */
    @Column(name = "promised_date")
    private LocalDate promisedDate;

    /** Ngày hẹn liên hệ lại — hệ thống nhắc kế toán vào ngày này */
    @Column(name = "next_reminder_date")
    private LocalDate nextReminderDate;

    /** Kế toán viên ghi nhận lần liên hệ này */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by")
    private User recordedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
