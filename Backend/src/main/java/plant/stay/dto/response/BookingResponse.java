package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import plant.stay.model.BookingStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class BookingResponse {
    private Long id;
    private Long guestId;
    private String guestName;
    private String guestPhone;
    private Long roomTypeId;
    private String roomTypeName;
    private Long roomId;
    private String roomNumber;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private BookingStatus status;
    private BigDecimal expectedPrice;
    private BigDecimal actualPrice;
    private BigDecimal cancellationFee;
    private String note;
    private String source;
    private String guestEmail;
    private String guestIdNumber;
    private LocalDateTime createdAt;
}
