package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ForceChangePasswordRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    private String account;

    @NotBlank(message = "Mật khẩu tạm thời không được để trống")
    private String tempPassword;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 6, message = "Mật khẩu mới phải có ít nhất 6 ký tự")
    private String newPassword;

    @NotBlank(message = "Xác nhận mật khẩu mới không được để trống")
    private String confirmPassword;
}
