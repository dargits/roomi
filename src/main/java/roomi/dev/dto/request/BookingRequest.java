package roomi.dev.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class BookingRequest {

    @NotNull(message = "guestId không được để trống")
    private Long guestId;

    @NotNull(message = "roomTypeId không được để trống")
    private Long roomTypeId;

    // roomId null = chưa gán phòng cụ thể (đặt theo loại phòng)
    private Long roomId;

    @NotNull(message = "checkInDate không được để trống")
    private LocalDate checkInDate;

    @NotNull(message = "checkOutDate không được để trống")
    private LocalDate checkOutDate;

    // WALK_IN | PHONE | EXTERNAL_CHANNEL | BOOKING_PORTAL  (mặc định WALK_IN)
    private String source;
}
