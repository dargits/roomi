package roomi.dev.dto.response;

import lombok.*;

@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String message;
    private String sessionId;
    private UserResponse user;
}