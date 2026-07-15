package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Builder
@Getter
@Setter
public class ErrorResponse {
    private String mess;
    private String code;
}