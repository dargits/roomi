package plant.stay.dto.request;

import jakarta.validation.Valid;
import lombok.Data;

import java.util.List;

@Data
public class CheckInRequest {
    @Valid
    private List<GuestCheckInDto> guests;
}
