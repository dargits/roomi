package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class GuestCheckInDto {
    @NotBlank(message = "Họ tên không được để trống")
    private String name;

    @Pattern(regexp = "^(\\d{9}|\\d{12})$", message = "CCCD/CMND phải bao gồm chính xác 9 hoặc 12 chữ số")
    private String idNumber;
}
