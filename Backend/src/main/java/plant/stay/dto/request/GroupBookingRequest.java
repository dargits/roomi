package plant.stay.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class GroupBookingRequest {

    private Long representativeGuestId;

    @NotBlank(message = "Tên người đại diện không được để trống")
    private String representativeName;

    private String representativePhone;
    private String representativeEmail;
    private String representativeIdNumber;

    @NotNull(message = "Ngày nhận phòng không được để trống")
    private LocalDate checkInDate;

    @NotNull(message = "Ngày trả phòng không được để trống")
    private LocalDate checkOutDate;

    private String note;

    @Valid
    @NotEmpty(message = "Cần chọn ít nhất một loại phòng")
    private List<GroupBookingRoomRequest> rooms;
}