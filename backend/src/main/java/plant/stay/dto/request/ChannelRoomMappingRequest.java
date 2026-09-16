package plant.stay.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelRoomMappingRequest {

    private Long id;

    @NotBlank(message = "Mã loại phòng bên kênh không được để trống")
    private String externalRoomTypeCode; // Mã loại phòng bên kênh OTA (vd: "DELUXE_DOUBLE")

    @NotNull(message = "Vui lòng chọn loại phòng tương ứng trong hệ thống")
    private Long roomTypeId;

    @NotNull(message = "Số phòng tối đa phân bổ không được để trống")
    @Min(value = 1, message = "Số phòng phân bổ phải từ 1 trở lên")
    private Integer allocatedRooms;
}
