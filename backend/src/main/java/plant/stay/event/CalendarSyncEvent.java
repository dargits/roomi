package plant.stay.event;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CalendarSyncEvent {
    private Long roomTypeId; // Có thể null nếu cần đồng bộ toàn bộ kênh
    private String reason;   // BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED, ROOM_MAINTENANCE,...
}
