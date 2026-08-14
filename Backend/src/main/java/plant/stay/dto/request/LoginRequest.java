package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "Tài khoản không được để trống")
    private String account;

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}
