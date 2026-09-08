package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GuestRequest {
    @NotBlank(message = "Tên khách không được để trống")
    private String name;

    private String phone;
    private String idNumber;
    private String email;
}
