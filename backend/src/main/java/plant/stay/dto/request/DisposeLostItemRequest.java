package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisposeLostItemRequest {

    @NotBlank(message = "Hình thức xử lý không được để trống")
    private String disposalMethod; // TIÊU HỦY, THANH LÝ, TẶNG TỪ THIỆN, SUNG CÔNG...

    private String disposalNote;
}
