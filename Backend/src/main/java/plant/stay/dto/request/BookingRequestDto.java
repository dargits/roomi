package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class BookingRequestDto {
    @NotBlank(message = "Tên khách không được để trống")
    private String guestName;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;

    private String email;

    @NotNull(message = "Loại phòng không được để trống")
    private Long roomTypeId;

    @NotNull(message = "Ngày nhận phòng không được để trống")
    private LocalDate checkInDate;

    @NotNull(message = "Ngày trả phòng không được để trống")
    private LocalDate checkOutDate;

    private String note;
}
