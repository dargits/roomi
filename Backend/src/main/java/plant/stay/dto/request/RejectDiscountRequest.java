package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request DTO để Chủ cơ sở từ chối khoản giảm giá.
 * POST /api/v1/invoices/{invoiceId}/discount/reject
 */
@Data
public class RejectDiscountRequest {

    /**
     * Lý do từ chối – bắt buộc để đảm bảo audit trail.
     */
    @NotBlank(message = "Lý do từ chối là bắt buộc nhập")
    private String rejectReason;
}
