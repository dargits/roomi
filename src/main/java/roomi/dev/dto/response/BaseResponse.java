package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Builder
@Getter
@Setter
public class BaseResponse <T>{
    private T data;
    private String mess;



}
