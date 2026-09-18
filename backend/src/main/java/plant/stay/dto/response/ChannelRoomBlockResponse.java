package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChannelRoomBlockResponse {
    private Long id;
    private Long channelId;
    private String channelName;
    private String channelCode;
    private Long roomTypeId;
    private String roomTypeName;
    private Long roomId;
    private String roomNumber;
    private String externalUid;
    private LocalDate startDate;
    private LocalDate endDate;
    private String summary;
    private String status;
    private Long convertedBookingId;
    private Boolean isExcess;
    private String warningMessage;
    private LocalDateTime createdAt;
}
