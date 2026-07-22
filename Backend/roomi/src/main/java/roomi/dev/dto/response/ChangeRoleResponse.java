package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Builder
@Getter
@Setter
public class ChangeRoleResponse {
    private Long id;
    private String role;
}
