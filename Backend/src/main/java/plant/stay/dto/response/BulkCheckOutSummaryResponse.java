package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCheckOutSummaryResponse {
    private Long groupBookingId;
    private String representativeName;
    private String invoiceMode; // COMBINED, SEPARATE, hoặc NONE
    private BigDecimal totalRoomAmount;
    private BigDecimal totalServiceAmount;
    private BigDecimal grandTotal;
    private BigDecimal totalPaid;
    private BigDecimal totalRemaining;
    private boolean isGroupInvoicePaid;
    
    @Builder.Default
    private List<BulkCheckOutRoomDetailDto> rooms = new ArrayList<>();
}
