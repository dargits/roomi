package plant.stay.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupBookingRoomRequest {

    @NotNull(message = "Loại phòng không được để trống")
    private Long roomTypeId;

    @NotNull(message = "Số lượng phòng không được để trống")
    @Min(value = 1, message = "Số lượng phòng phải lớn hơn 0")
    private Integer quantity;
}