package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import plant.stay.model.Role;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSessionResponse {
    private Long id;
    private Long userId;
    private String account;
    private String name;
    private Role role;
    private LocalDateTime loginAt;
    private LocalDateTime lastActiveAt;
    private String ipAddress;
    private String deviceInfo;
    private String userAgent;
    private String status;
    private boolean isCurrentSession;
}
