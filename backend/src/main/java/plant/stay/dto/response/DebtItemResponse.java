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
    private LocalDateTime documentSentAt;
    private String documentSentTo;
    private LocalDate reminderSentForDueDate;
    private LocalDateTime reminderSentAt;
}
