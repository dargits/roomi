package plant.stay.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserUpdateRequest {
    @NotBlank(message = "Tên người dùng không được để trống")
    private String name;

    private String phone;

    @Email(message = "Email không hợp lệ")
    private String email;

    private String avatarImage;
}
