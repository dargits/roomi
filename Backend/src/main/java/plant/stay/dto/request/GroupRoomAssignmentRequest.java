package plant.stay.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class GroupRoomAssignmentRequest {

    @Valid
    @NotEmpty(message = "Cần gán phòng cho tất cả booking còn thiếu của đoàn")
    private List<GroupRoomAssignmentItemRequest> assignments;
}