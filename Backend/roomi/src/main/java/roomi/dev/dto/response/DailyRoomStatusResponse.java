package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Builder
@Getter
@Setter
public class DailyRoomStatusResponse {

    private Long roomId;
    private String roomNumber;
    private String floor;
    private Long roomTypeId;
    private String roomTypeName;
    private LocalDate date;
    private String status;
    private Long bookingId;
    private String guestName;
}