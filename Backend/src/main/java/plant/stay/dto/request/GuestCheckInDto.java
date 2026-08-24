package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class GuestCheckInDto {
    @NotBlank(message = "Họ tên không được để trống")
    private String name;

    @Pattern(regexp = "^[A-Za-z0-9]{6,20}$", message = "CCCD/CMND hoặc Hộ chiếu không hợp lệ (từ 6-20 ký tự)")
    private String idNumber;

    private String phone;
}
