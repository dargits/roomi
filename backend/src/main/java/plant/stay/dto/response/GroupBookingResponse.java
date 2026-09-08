package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class GroupBookingResponse {
    private Long id;
    private Long representativeGuestId;
    private String representativeName;
    private String representativePhone;
    private String representativeEmail;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private String note;
    private String status;
    private int totalRooms;
    private int assignedRooms;
    private BigDecimal expectedTotal;
    private boolean depositPaid;
    private BigDecimal depositAmount;
    private BigDecimal requiredDepositAmount;
    private boolean hasInvoice;
    private String invoiceStatus;
    private BigDecimal invoiceTotalAmount;
    private BigDecimal invoicePaidAmount;
    private BigDecimal invoiceOutstandingAmount;
    private List<BookingResponse> bookings;
    private LocalDateTime createdAt;
}