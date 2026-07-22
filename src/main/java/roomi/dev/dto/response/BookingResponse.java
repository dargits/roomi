package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Builder
@Getter
@Setter
public class BookingResponse {
    private Long id;

    // Guest info (phẳng — không cần nest object)
    private Long guestId;
    private String guestName;
    private String guestPhone;

    // Room info
    private Long roomTypeId;
    private String roomTypeName;
    private Long roomId;
    private String roomNumber;

    private LocalDate checkInDate;
    private LocalDate checkOutDate;

    /** Số đêm */
    private Integer nights;

    private String status;
    private String source;

    /** Giá dự kiến tính theo SeasonalRate (nếu có) hoặc basePrice */
    private BigDecimal expectedPrice;

    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
}
