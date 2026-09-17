package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import plant.stay.model.DebtApprovalStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DebtItemResponse {
    private Long id;
    private Long bookingId;
    private Long invoiceId;
    private String invoiceNumber;
    private Long guestId;
    private String guestName;
    private String guestPhone;
    private String guestEmail;
    private String roomNumber;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal debtAmount;
    private LocalDate dueDate;
    private long daysOverdue;
    private DebtApprovalStatus status;
    private String reason;
    private String requestedByName;
    private LocalDateTime requestedAt;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private String rejectReason;

    // === Thông tin Báo cáo Tuổi nợ & Nhắc thu ===

    /** Nhóm tuổi nợ: CURRENT, OVERDUE_UNDER_15, OVERDUE_15_TO_30, OVERDUE_OVER_30 */
    private String agingBucket;

    /** Trạng thái nhắc thu: DUE_TODAY, OVERDUE_REMINDER, UPCOMING, NONE */
    private String reminderStatus;

    /** Thời điểm liên hệ đòi nợ gần nhất */
    private LocalDateTime lastContactedAt;

    /** Ghi chú tóm tắt lần liên hệ gần nhất */
    private String lastContactNote;

    /** Kết quả lần liên hệ gần nhất */
    private String lastContactResult;

    /** Ngày khách hẹn thanh toán */
    private LocalDate promisedDate;

    /** Ngày hẹn liên hệ lại kế tiếp */
    private LocalDate nextReminderDate;

    /** Số lần đã liên hệ đòi nợ */
    private long collectionCount;

    /** Ngày check-in */
    private LocalDate checkInDate;

    /** Ngày trả phòng */
    private LocalDate checkOutDate;
}

