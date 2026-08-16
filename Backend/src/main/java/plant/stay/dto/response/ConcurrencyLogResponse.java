package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response trả về một bản ghi nhật ký va chạm đồng thời
 */
@Data
@Builder
public class ConcurrencyLogResponse {
    private Long id;
    private Long roomId;
    private String roomNumber;
    private Long rejectedBookingId;
    private Long conflictingBookingId;
    private String actorName;
    private String actionType;
    private String detail;
    private Boolean fromStressTest;
    private String testSessionId;
    private LocalDateTime occurredAt;
}
