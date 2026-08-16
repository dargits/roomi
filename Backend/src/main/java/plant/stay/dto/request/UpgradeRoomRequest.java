package plant.stay.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request nâng/hạ hạng phòng giữa kỳ lưu trú — NCL-04-CN-008 (QTN-22)
 */
@Data
public class UpgradeRoomRequest {

    @NotNull(message = "Phòng mới không được để trống")
    private Long newRoomId;

    // Lý do bắt buộc khi hạ hạng — NCL-04-CN-008-TC-03
    private String reason;
}
