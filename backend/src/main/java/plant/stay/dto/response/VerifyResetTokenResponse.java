package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerifyResetTokenResponse {
    private boolean valid;
    private String account;
    private String userName;
    private String userEmail;
    private Long remainingSeconds;
    private String message;
}
