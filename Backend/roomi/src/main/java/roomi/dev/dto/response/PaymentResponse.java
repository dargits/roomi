package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Builder
@Getter
public class PaymentResponse {
    private Long id;
    private Long invoiceId;
    private BigDecimal amount;
    private String method;
    private Long receivedById;
    private String receivedByName;
    private LocalDateTime paidAt;
}
