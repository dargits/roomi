package roomi.dev.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class BookingRequest {

    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;

    @NotBlank(message = "idNumber không được để trống")
    private String idNumber;

    private String email;

    @NotNull(message = "roomTypeId không được để trống")
    private Long roomTypeId;

    private Long roomId;

    @NotNull(message = "checkInDate không được để trống")
    private LocalDate checkInDate;

    @NotNull(message = "checkOutDate không được để trống")
    private LocalDate checkOutDate;

    private String source; // WALK_IN | PHONE | EXTERNAL_CHANNEL | BOOKING_PORTAL
    private String note;
}