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
public class GroupBookingPreviewResponse {
    private int totalRooms;
    private long nights;
    private BigDecimal expectedTotal;
    private BigDecimal requiredDepositAmount;
    private BigDecimal defaultDepositPercent;
    private BigDecimal globalThreshold;
    private boolean aboveThreshold;
    private Long appliedAgreementId;
    private String appliedAgreementName;
    private List<RoomLinePreview> roomLines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomLinePreview {
        private Long roomTypeId;
        private String roomTypeName;
        private int quantity;
        private BigDecimal pricePerNight;
        private BigDecimal totalPrice;
        private BigDecimal depositPercent;
        private BigDecimal depositAmount;
        /** Ngưỡng tiền phòng (đ) để bắt cọc. null = không có ngưỡng. */
        private BigDecimal minimumAmountThreshold;
        /** true nếu tổng tiền nhóm đã >= ngưỡng (hoặc không có ngưỡng) → áp cọc */
        private boolean aboveThreshold;
    }
}

