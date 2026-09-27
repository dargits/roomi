package plant.stay.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import plant.stay.model.Role;

@Data
public class RegisterRequest {

    @NotBlank(message = "Tên tài khoản không được để trống")
    @Size(min = 4, message = "Tài khoản phải có ít nhất 4 ký tự")
    private String account;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
    private String password;

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

    @NotNull(message = "Vai trò (Role) không được để trống")
    private Role role;
}
