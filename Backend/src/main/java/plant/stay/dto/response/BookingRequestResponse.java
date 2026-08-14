package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import plant.stay.model.BookingRequestStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class BookingRequestResponse {
    private Long id;
    private String guestName;
    private String phone;
    private String email;
    private Long roomTypeId;
    private String roomTypeName;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private String note;
    private BookingRequestStatus status;
    private String rejectReason;
    private Long convertedBookingId;
    private LocalDateTime createdAt;
}
