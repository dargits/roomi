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
public class StayingGuestsSummaryDto {
    private List<RoomStayGuestResponseDto> guests;
    private Integer standardCapacity;
    private Integer maxCapacity;
    private BigDecimal extraPersonChargePerNight;
    private Integer maxChildAgeFree;
    private Long totalNights;
    private Integer totalGuests;
    private Integer extraGuests;
    private Integer childCount;
    private Integer chargeableExtraGuests;
    private BigDecimal extraChargePerNight;
    private BigDecimal totalExtraCharge;
    private BigDecimal baseRoomPrice;
    private BigDecimal currentActualPrice;
}
