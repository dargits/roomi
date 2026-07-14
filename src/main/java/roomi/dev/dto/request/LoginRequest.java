package roomi.dev.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class LoginRequest {
    
    @NotBlank(message = "Tài khoản không được để trống")
    private String account;
    
    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}