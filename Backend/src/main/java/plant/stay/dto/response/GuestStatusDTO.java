package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class GuestStatusDTO {
    private Long bookingId;
    private Long guestId;
    private String guestName;
    private String phone;
    private String idNumber;
    private String roomNumber;
    private LocalDateTime checkedInAt;
    private String documentStatus;
    private List<String> missingRequirements;
    private String declarationStatus;
    private LocalDateTime declarationCompletedAt;
}