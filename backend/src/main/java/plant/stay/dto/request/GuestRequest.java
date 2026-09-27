package plant.stay.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GuestRequest {
    @NotBlank(message = "Tên khách không được để trống")
    @Size(max = 100, message = "Tên khách không được vượt quá 100 ký tự")
    private String name;

    @Pattern(
        regexp = "^$|^(0|\\+84)(3|5|7|8|9)[0-9]{8}$|^02[0-9]{9}$", 
        message = "Số điện thoại không đúng định dạng (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)"
    )
    @Size(max = 20, message = "Số điện thoại không được vượt quá 20 ký tự")
    private String phone;

    @Pattern(
        regexp = "^$|^[0-9]{9}$|^[0-9]{12}$|^[a-zA-Z][0-9]{7,8}$", 
        message = "Số CCCD/CMND không hợp lệ (phải gồm 9 hoặc 12 chữ số, hoặc Hộ chiếu 1 chữ cái và 7-8 số)"
    )
    @Size(max = 50, message = "CCCD/CMND không được vượt quá 50 ký tự")
    private String idNumber;

    @Email(message = "Email không đúng định dạng")
    @Size(max = 100, message = "Email không được vượt quá 100 ký tự")
    private String email;
}
