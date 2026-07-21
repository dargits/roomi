package roomi.dev.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GuestRequest {

    @NotBlank(message = "fullName không được để trống")
    private String fullName;

    private String phone;
    private String email;
    private String idNumber;
    private String note;
}
