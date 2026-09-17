package plant.stay.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelResponse {
    private Long id;
    private String name;
    private String channelCode;
    private Long roomTypeId;
    private String roomTypeName;
    private Integer allocatedRooms;
    private String feedToken;
    private String feedUrl; // Đường dẫn public đầy đủ đến tệp .ics mà cơ sở chia sẻ ngược lại cho kênh
    private String externalCalendarUrl; // Đường dẫn tệp lịch mà kênh cung cấp
    private java.util.List<ChannelRoomMappingResponse> mappings; // Bảng ánh xạ loại phòng
    private Integer syncIntervalMinutes;
    private Boolean isActive;
    private LocalDateTime lastSyncedAt;
    private String lastSyncStatus; // SUCCESS, ERROR, NEVER_SYNCED, WARNING
    private String lastSyncErrorMessage;
    private LocalDateTime lastSuccessSyncedAt;
    private Integer consecutiveFailures;
    private String connectionStatus; // HEALTHY, DISCONNECTED, STALE, PAUSED
    private String connectionStatusMessage; // Tiếng Việt mô tả trực quan trạng thái
    private Integer lastBlockedPeriodsCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
