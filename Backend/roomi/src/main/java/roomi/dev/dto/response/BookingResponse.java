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

    // Guest info
    private Long guestId;
    private String guestName;
    private String guestFullName; // Thêm khớp với JS
    private String guestPhone;
    private String guestIdNumber; // Thêm khớp với JS
    private String guestEmail;

    // Room info
    private Long roomTypeId;
    private String roomTypeName;
    private Long roomId;
    private String roomNumber;

    private LocalDate checkInDate;
    private LocalDate checkOutDate;

    private Integer nights;
    private String status;
    private String source;
    private String note;

    private BigDecimal expectedPrice;

    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
}