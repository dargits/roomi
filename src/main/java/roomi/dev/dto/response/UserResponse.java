package roomi.dev.dto.response;

import lombok.*;

@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private Long id;
    private String userName;
    private String account;
    private String email;
    private String phone;
    private String avatarUrl;
    private String roleName;
}