package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import plant.stay.model.ConfirmationChannel;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingConfirmationLogResponse {
    private Long id;
    private Long bookingId;
    private ConfirmationChannel channel;
    private String channelDisplayName;
    private String recipient;
    private Long sentById;
    private String sentByName;
    private String status; // SUCCESS, FAILED
    private String note;
    private LocalDateTime sentAt;
}
