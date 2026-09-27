package plant.stay.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class PublicGroupBookingRequestDTO {

    @NotBlank(message = "Tên người đại diện không được để trống")
    private String representativeName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(
        regexp = "^(0|\\+84)(3|5|7|8|9)[0-9]{8}$|^02[0-9]{9}$", 
        message = "Số điện thoại không đúng định dạng (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)"
    )
    private String phone;

    @Pattern(
        regexp = "^$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", 
        message = "Email không đúng định dạng"
    )
    private String email;

    @NotNull(message = "Ngày nhận phòng không được để trống")
    private LocalDate checkInDate;

    @NotNull(message = "Ngày trả phòng không được để trống")
    private LocalDate checkOutDate;

    private String note;

    @Valid
    @NotEmpty(message = "Cần chọn ít nhất một loại phòng")
    private List<GroupBookingRoomRequest> rooms;

    // Anti-spam fields
    private String websiteTrap; // Honeypot field (phải rỗng)
    private Long submissionElapsedMs; // Thời gian thao tác của client (ms)
    private String botVerificationToken; // Mã xác thực chống bot
}