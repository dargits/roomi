package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Một ô booking trên lịch của một phòng.
 * Dùng để render timeline/calendar cho từng phòng.
 */
@Builder
@Getter
@Setter
public class BookingSlotResponse {

    private Long        bookingId;
    private String      guestName;
    private String      guestPhone;
    private String      guestIdNumber;
    private LocalDate   checkInDate;
    private LocalDate   checkOutDate;
    private Integer     nights;
    private String      status;          // NEW | CONFIRMED | CHECKED_IN | ...
    private BigDecimal  expectedPrice;
}
