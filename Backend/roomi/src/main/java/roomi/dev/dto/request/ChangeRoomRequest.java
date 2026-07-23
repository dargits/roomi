package roomi.dev.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangeRoomRequest {

    @NotNull(message = "roomId không được để trống")
    private Long roomId;

    private String reason; // lý do đổi phòng (tuỳ chọn)
}
