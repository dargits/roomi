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
public class UserExtraPermissionDto {
    private Long id;
    private String permission;
    private String permissionLabel;
    private LocalDate expiresAt;
    private String reason;
    private String grantedByName;
    private LocalDateTime grantedAt;
    private boolean isExpired;
    private boolean isRevoked;
    private String revokeReason;
}
