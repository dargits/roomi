package plant.stay.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class BookingRequest {
    @NotNull(message = "KhÃ¡ch hÃ ng khÃ´ng ÄÆ°á»£c Äá» trá»ng")
    private Long guestId;

    @NotNull(message = "Loáº¡i phÃ²ng khÃ´ng ÄÆ°á»£c Äá» trá»ng")
    private Long roomTypeId;

    private Long roomId; // Optional â cÃ³ thá» gÃ¡n phÃ²ng sau

    @NotNull(message = "NgÃ y nháº­n phÃ²ng khÃ´ng ÄÆ°á»£c Äá» trá»ng")
    private LocalDate checkInDate;

    @NotNull(message = "NgÃ y tráº£ phÃ²ng khÃ´ng ÄÆ°á»£c Äá» trá»ng")
    private LocalDate checkOutDate;

    private Integer guestCount;
    private Integer childCount;

    private String note;
    private String source; // WALKIN, PHONE, SOCIAL, ONLINE, SIMULATION
    private Long corporateClientId; // ID ho so khach cong ty (neu co)
    private Long groupBookingId; // ID doan dat phong (neu co)
}
