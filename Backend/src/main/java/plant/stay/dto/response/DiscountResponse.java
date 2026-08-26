package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import plant.stay.model.DiscountStatus;
import plant.stay.model.DiscountType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO trả về thông tin khoản giảm giá.
 */
@Data
@Builder
public class DiscountResponse {

    private Long id;

    private Long invoiceId;

    /** Loại giảm giá: PERCENTAGE / FIXED_AMOUNT */
    private DiscountType discountType;

    /** Giá trị nhập vào (% hoặc số tiền) */
    private BigDecimal discountValue;

    /** Số tiền giảm thực tế đã tính ra (QTN-12) */
    private BigDecimal calculatedAmount;

    /** Lý do giảm giá */
    private String reason;

    /** Trạng thái: PENDING_APPROVAL / APPLIED / REJECTED */
    private DiscountStatus status;

    /** Thông điệp mô tả trạng thái (auto-approved hay pending approval) */
    private String statusMessage;

    private LocalDateTime createdAt;
    private String createdByName;

    private LocalDateTime reviewedAt;
    private String reviewedByName;

    /** Lý do từ chối (chỉ có khi status = REJECTED) */
    private String rejectReason;
}
