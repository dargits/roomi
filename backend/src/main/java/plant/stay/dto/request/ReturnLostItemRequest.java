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
public class ReturnLostItemRequest {

    @NotBlank(message = "Tên người nhận không được để trống")
    private String receiverName;

    private String receiverPhone;

    private String receiverNote;
}
