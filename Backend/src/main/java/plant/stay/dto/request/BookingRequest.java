package plant.stay.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class BookingRequest {
    @NotNull(message = "Khách hàng không được để trống")
    private Long guestId;

    @NotNull(message = "Loại phòng không được để trống")
    private Long roomTypeId;

    private Long roomId; // Optional — có thể gán phòng sau

    @NotNull(message = "Ngày nhận phòng không được để trống")
    private LocalDate checkInDate;

    @NotNull(message = "Ngày trả phòng không được để trống")
    private LocalDate checkOutDate;

    private String note;
}
