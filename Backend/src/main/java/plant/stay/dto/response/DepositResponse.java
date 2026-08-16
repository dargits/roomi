package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import plant.stay.model.DepositStatus;
import plant.stay.model.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response trả về thông tin khoản đặt cọc
 */
@Data
@Builder
public class DepositResponse {
    private Long id;
    private Long bookingId;
    private BigDecimal requiredAmount;
    private BigDecimal collectedAmount;
    private BigDecimal refundedAmount;
    private BigDecimal penaltyAmount;
    private DepositStatus status;
    private PaymentMethod paymentMethod;
    private String shortPaidReason;
    private String note;
    private String collectedByName;
    private String processedByName;
    private LocalDateTime collectedAt;
    private LocalDateTime processedAt;
    private LocalDateTime createdAt;
}
