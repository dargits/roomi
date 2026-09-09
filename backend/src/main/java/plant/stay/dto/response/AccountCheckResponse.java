package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountCheckResponse {
    private boolean exists;
    private String account;
    private String name;
    private String role;
    private boolean active;
}
