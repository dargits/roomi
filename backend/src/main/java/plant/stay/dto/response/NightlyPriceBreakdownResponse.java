package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NightlyPriceBreakdownResponse {
    private Long roomTypeId;
    private String roomTypeName;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private long totalNights;
    
    @Builder.Default
    private List<NightlyPriceDetailDto> nightlyDetails = new ArrayList<>();
    
    private BigDecimal totalRoomPrice;
    
    // Phần sức chứa & phụ thu người vượt tiêu chuẩn (NCL-02-CN-005)
    private int standardCapacity;
    private int maxCapacity;
    private int guestCount;
    private int extraGuests;
    private BigDecimal extraPersonChargePerNight;
    private BigDecimal totalExtraCharge;
    
    private BigDecimal grandTotal;
}
