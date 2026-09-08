package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class GrantExtraPermissionRequest {
    @NotBlank(message = "Mã quyền không được để trống")
    private String permission;

    private LocalDate expiresAt; // Tùy chọn (đặt hạn sử dụng)

    @NotBlank(message = "Lý do cấp quyền không được để trống")
    private String reason;
}
