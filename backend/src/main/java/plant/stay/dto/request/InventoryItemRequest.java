package plant.stay.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InventoryItemRequest {
    @NotBlank(message = "Tên mặt hàng không được để trống")
    private String name;

    @NotBlank(message = "Đơn vị không được để trống")
    private String unit;

    @NotNull
    @Min(value = 0, message = "Tồn kho phải >= 0")
    private Integer quantityOnHand;

    @NotNull
    @Min(value = 0, message = "Ngưỡng cảnh báo phải >= 0")
    private Integer lowStockThreshold;
}
