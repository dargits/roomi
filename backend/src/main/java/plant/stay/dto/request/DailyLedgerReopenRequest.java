package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DailyLedgerReopenRequest {
    @NotBlank(message = "Vui long nhap ly do mo lai so ngay.")
    private String reason;
}
