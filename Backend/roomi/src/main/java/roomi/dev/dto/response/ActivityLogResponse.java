package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Builder
@Getter
public class ActivityLogResponse {
    private Long id;
    private Long userId;
    private String userFullName;
    private String userRole;
    private String action;
    private String entityName;
    private Long entityId;
    private String detail;
    private LocalDateTime createdAt;
}
