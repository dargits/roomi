package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCheckOutRoomDetailDto {
    private Long bookingId;
    private String roomNumber;
    private String roomTypeName;
    private String guestName;
    private BigDecimal roomAmount;
    private BigDecimal serviceAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private boolean hasUnsettledServices;
    private boolean canCheckOut;
    private String blockerReason;
}
