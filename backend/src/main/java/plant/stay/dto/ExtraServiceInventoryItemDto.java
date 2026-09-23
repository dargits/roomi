package plant.stay.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExtraServiceInventoryItemDto {
    private Long id;
    private Long inventoryItemId;
    private String itemName;
    private String unit;
    private Integer quantity; // Định mức xuất kho cho mỗi 1 đơn vị dịch vụ
    private Integer currentStock; // Số lượng tồn kho hiện tại (để hiển thị UI)
}
