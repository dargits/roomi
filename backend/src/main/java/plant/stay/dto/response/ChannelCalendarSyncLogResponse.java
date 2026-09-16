package plant.stay.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelCalendarSyncLogResponse {
    private Long id;
    private Long channelId;
    private String channelName;
    private String roomTypeName;
    private String triggeredBy;
    private Integer blockedPeriodsCount;
    private String blockedSummary;
    private String status;
    private String errorMessage;
    private LocalDateTime syncedAt;
}
