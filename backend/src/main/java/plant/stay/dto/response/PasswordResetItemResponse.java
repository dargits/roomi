package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import plant.stay.model.PasswordResetStatus;
import plant.stay.model.Role;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetItemResponse {
    private Long id;
    private Long userId;
    private String account;
    private String userName;
    private String userEmail;
    private Role userRole;
    private PasswordResetStatus status;
    private String plainTempPassword;
    private LocalDateTime expiresAt;
    private LocalDateTime requestedAt;
    private String issuedByName;
    private LocalDateTime issuedAt;
    private LocalDateTime usedAt;
    private Boolean emailSent;
    private String emailMessage;
}
