package roomi.dev.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 150, message = "Họ tên không được quá 150 ký tự")
    private String fullName;
    
    @NotBlank(message = "Username không được để trống")
    @Size(max = 50, message = "Username không được quá 50 ký tự")
    private String username;
    
    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
    private String password;

    @Size(max = 20, message = "Số điện thoại không được quá 20 ký tự")
    private String phone;
}