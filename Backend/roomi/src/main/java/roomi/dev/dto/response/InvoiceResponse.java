package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Builder
@Getter
public class InvoiceResponse {
    private Long id;
    private Long bookingId;
    private BigDecimal roomCharge;
    private BigDecimal serviceCharge;
    private BigDecimal discount;
    private BigDecimal totalAmount;
    private String status;
    private LocalDateTime createdAt;
    private List<BookingSurchargeUsageResponse> serviceUsages;
}
