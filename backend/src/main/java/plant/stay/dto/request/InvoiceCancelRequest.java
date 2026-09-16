package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceCancelRequest {

    @NotBlank(message = "Lý do hủy hóa đơn không được để trống")
    @Size(min = 3, max = 500, message = "Lý do hủy phải từ 3 đến 500 ký tự")
    private String reason;
}
