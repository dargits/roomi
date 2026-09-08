package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DebtApprovalRejectRequest {
    @NotBlank(message = "Lý do từ chối không được để trống")
    private String rejectReason;
}
