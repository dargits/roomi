package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInReminderData {
    private Long bookingId;
    private String guestName;
    private String guestPhone;
    private String guestEmail;
    
    // Thông tin cơ sở lưu trú
    private String hotelName;
    private String hotelAddress;
    private String hotelPhone;
    private String hotelEmail;

    // Chi tiết phòng & lịch trình
    private String roomTypeName;
    private String roomNumber;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private LocalTime checkInTime;
    private LocalTime checkOutTime;
    private long numberOfNights;

    // Chi phí & Thanh toán
    private BigDecimal totalPrice;
    private BigDecimal depositAmount;
    private BigDecimal remainingAmount;

    private String note;
    private String lookupUrl;
}
