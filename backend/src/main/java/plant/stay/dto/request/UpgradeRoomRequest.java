package plant.stay.dto.request;

import lombok.Data;

/**
 * Request nâng/hạ hạng phòng giữa kỳ lưu trú — NCL-04-CN-008 (QTN-22)
 */
@Data
public class UpgradeRoomRequest {

    private Long newRoomTypeId; // ID loại phòng mới muốn nâng/hạ sang

    private Long newRoomId;     // Optional: ID phòng cụ thể nếu có

    // Lý do bắt buộc khi hạ hạng — NCL-04-CN-008-TC-03
    private String reason;
}
