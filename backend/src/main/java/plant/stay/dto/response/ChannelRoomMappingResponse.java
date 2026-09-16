package plant.stay.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelRoomMappingResponse {
    private Long id;
    private String externalRoomTypeCode;
    private Long roomTypeId;
    private String roomTypeName;
    private Integer allocatedRooms;
    private Long totalPhysicalRooms; // Số phòng thực có của loại này trong hệ thống
    private Integer totalAllocatedAcrossChannels; // Tổng số phòng đã phân bổ trên tất cả các kênh
}
