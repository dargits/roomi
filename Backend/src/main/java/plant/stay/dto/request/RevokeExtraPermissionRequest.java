package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RevokeExtraPermissionRequest {
    @NotBlank(message = "Lý do thu hồi quyền không được để trống")
    private String reason;
}
