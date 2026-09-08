package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import plant.stay.model.InvoiceMode;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class GroupInvoiceResponse {
    private Long groupBookingId;
    private InvoiceMode mode;
    private InvoiceMode suggestedMode;
    private BigDecimal roomAmount;
    private BigDecimal serviceAmount;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal outstandingAmount;
    private List<InvoiceResponse> invoices;
}