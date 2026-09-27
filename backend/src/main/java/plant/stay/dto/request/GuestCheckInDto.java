package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class GuestCheckInDto {
    @NotBlank(message = "Họ tên không được để trống")
    private String name;

    @Pattern(
        regexp = "^$|^[0-9]{9}$|^[0-9]{12}$|^[a-zA-Z][0-9]{7,8}$", 
        message = "Số CCCD/CMND hoặc Hộ chiếu không hợp lệ (phải gồm 9 hoặc 12 chữ số, hoặc Hộ chiếu 1 chữ cái và 7-8 số)"
    )
    private String idNumber;

    @Pattern(
        regexp = "^$|^(0|\\+84)(3|5|7|8|9)[0-9]{8}$|^02[0-9]{9}$", 
        message = "Số điện thoại không đúng định dạng (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)"
    )
    private String phone;
    
    private String frontImage;
    
    private String backImage;
}
