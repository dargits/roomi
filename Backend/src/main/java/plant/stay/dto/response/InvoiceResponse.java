package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import plant.stay.model.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class InvoiceResponse {
    private Long id;
    private Long bookingId;
    private BigDecimal roomAmount;
    private BigDecimal serviceAmount;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private InvoiceStatus status;
    private Long adjustmentOfId;
    private String note;
    private LocalDateTime createdAt;
}
