package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Request body khi kế toán ghi nhận một lần liên hệ đòi nợ.
 */
@Data
public class DebtCollectionLogRequest {

    /** Thời điểm liên hệ (nếu null thì lấy LocalDateTime.now() tại server) */
    private LocalDateTime contactDate;

    /** Hình thức liên hệ: PHONE, EMAIL, ZALO, IN_PERSON, SMS, OTHER */
    @NotBlank(message = "Vui lòng chọn hình thức liên hệ")
    private String contactMethod;

    /** Kết quả: PROMISED_TO_PAY, NO_ANSWER, COMPLAINT, PENDING_APPROVAL, OTHER */
    private String contactResult;

    /** Nội dung trao đổi / ghi chú */
    @NotBlank(message = "Vui lòng nhập nội dung ghi chú liên hệ đòi nợ")
    private String notes;

    /** Ngày khách hẹn thanh toán (tùy chọn) */
    private LocalDate promisedDate;

    /** Ngày hẹn liên hệ lại — hệ thống nhắc kế toán vào ngày này */
    private LocalDate nextReminderDate;

    /** Email người nhận (nếu gửi qua email) */
    private String recipientEmail;

    /** Cờ xác định có thực sự gửi email hay chỉ ghi log */
    private Boolean sendEmail;
}
