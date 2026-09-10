package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class DebtAcknowledgementData {
    private Long debtRequestId;
    private Long bookingId;
    private Long invoiceId;
    private String hotelName;
    private String hotelAddress;
    private String hotelPhone;
    private String hotelEmail;
    private String guestName;
    private String guestPhone;
    private String guestEmail;
    private String guestIdNumber;
    private String roomNumber;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private BigDecimal invoiceTotal;
    private BigDecimal paidAmount;
    private BigDecimal debtAmount;
    private LocalDate dueDate;
    private String reason;
    private String approvedByName;
    private LocalDateTime approvedAt;
}
