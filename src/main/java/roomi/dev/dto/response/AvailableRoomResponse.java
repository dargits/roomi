package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Response trả về một phòng còn trống (available) trong khoảng thời gian được yêu cầu.
 * Kèm theo giá dự kiến đã tính theo SeasonalRate.
 */
@Builder
@Getter
@Setter
public class AvailableRoomResponse {

    private Long        roomId;
    private String      roomNumber;
    private String      floor;
    private Long        roomTypeId;
    private String      roomTypeName;
    private Integer     capacity;
    private String      amenities;

    /** Giá dự kiến cho toàn bộ khoảng thời gian (tính theo SeasonalRate) */
    private BigDecimal  expectedPrice;

    /** Số đêm */
    private Integer     nights;
}
