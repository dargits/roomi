package roomi.dev.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserRequest {
    
    @NotBlank(message = "Tên người dùng không được để trống")
    @Size(min = 2, max = 50, message = "Tên người dùng phải từ 2-50 ký tự")
    private String userName;
    
    @NotBlank(message = "Tài khoản không được để trống")
    @Size(min = 3, max = 30, message = "Tài khoản phải từ 3-30 ký tự")
    private String account;
    
    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, message = "Mật khẩu phải ít nhất 6 ký tự")
    private String password;
    
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;
    
    @Size(min = 10, max = 11, message = "Số điện thoại phải 10-11 số")
    private String phone;
    
    private String avatarUrl;
}