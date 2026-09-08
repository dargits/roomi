package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupCancelPreviewResponse {
    private Long groupBookingId;
    private int cancellingRoomsCount;
    private BigDecimal totalCancellationFee;
    private BigDecimal remainingExpectedTotal;
    private List<RoomCancelPreviewItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomCancelPreviewItem {
        private Long bookingId;
        private String roomTypeName;
        private String roomNumber;
        private BigDecimal roomPrice;
        private BigDecimal cancellationFee;
        private boolean isFreeCancellation;
    }
}
