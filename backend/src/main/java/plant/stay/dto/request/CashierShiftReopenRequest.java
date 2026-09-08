package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CashierShiftReopenRequest {
    @NotBlank
    @Size(max = 2000)
    private String reason;
}