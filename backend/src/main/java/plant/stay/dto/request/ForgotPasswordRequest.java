package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    private String account;
}
