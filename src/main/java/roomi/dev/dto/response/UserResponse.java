package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Builder
@Getter
@Setter
public class UserResponse {
    private Long id;
    private String fullName;
    private String username;
    private String role;
    private String phone;
    private Boolean active;
    private LocalDateTime createdAt;
}
