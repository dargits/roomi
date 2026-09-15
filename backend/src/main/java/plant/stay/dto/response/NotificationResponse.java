package plant.stay.dto.response;

import lombok.*;
import plant.stay.model.NotificationType;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String title;
    private String body;
    private String refType;
    private Long refId;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
