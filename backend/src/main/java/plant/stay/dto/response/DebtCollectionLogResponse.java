package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Trả về thông tin một lần liên hệ đòi nợ trong lịch sử.
 */
@Data
@Builder
public class DebtCollectionLogResponse {
    private Long id;
    private Long debtApprovalRequestId;
    private LocalDateTime contactDate;
    private String contactMethod;       // PHONE, EMAIL, ZALO, IN_PERSON, SMS, OTHER
    private String contactResult;       // PROMISED_TO_PAY, NO_ANSWER, COMPLAINT, ...
    private String notes;
    private LocalDate promisedDate;
    private LocalDate nextReminderDate;
    private String recordedByName;      // Tên kế toán viên đã ghi nhận
    private LocalDateTime createdAt;
}
