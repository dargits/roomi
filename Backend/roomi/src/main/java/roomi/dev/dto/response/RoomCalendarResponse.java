package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Response hiển thị lịch đặt phòng (calendar view) của một phòng cụ thể.
 * Bao gồm thông tin phòng + danh sách các ô booking trong khoảng thời gian yêu cầu.
 */
@Builder
@Getter
@Setter
public class RoomCalendarResponse {

    private Long    roomId;
    private String  roomNumber;
    private String  floor;
    private String  status;          // AVAILABLE | OCCUPIED | NEEDS_CLEANING | MAINTENANCE
    private Long    roomTypeId;
    private String  roomTypeName;
    
    /**
     * Danh sách các booking (slot) trong khoảng thời gian được query.
     * Sắp xếp theo checkInDate tăng dần.
     */
    private List<BookingSlotResponse> bookings;
}
