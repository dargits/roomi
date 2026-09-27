package plant.stay.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserUpdateRequest {
    @NotBlank(message = "Tên người dùng không được để trống")
    private String name;

    @jakarta.validation.constraints.Pattern(
        regexp = "^$|^(0|\\+84)(3|5|7|8|9)[0-9]{8}$|^02[0-9]{9}$", 
        message = "Số điện thoại không đúng định dạng (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)"
    )
    private String phone;

    @Email(message = "Email không hợp lệ")
    private String email;

    private String avatarImage;
}
