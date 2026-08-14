package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import plant.stay.model.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PaymentResponse {
    private Long id;
    private Long invoiceId;
    private BigDecimal amount;
    private PaymentMethod method;
    private LocalDateTime paidAt;
    private String collectedByName;
    private String note;
}
