package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;
import plant.stay.model.RoomStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class RoomResponse {
    private Long id;
    private String roomNumber;
    private Long roomTypeId;
    private String roomTypeName;
    private Integer maxCapacity;
    private String floor;
    private RoomStatus status;
    private String notes;

    // NCL-06-CN-004: Phân công dọn phòng
    private Long assignedHousekeeperId;
    private String assignedHousekeeperName;
    private LocalDateTime assignedAt;

    // Mức ưu tiên dọn dẹp theo khách nhận phòng kế tiếp
    private LocalDate nextCheckInDate;
    private java.time.LocalTime nextCheckInTime;
    private String nextGuestName;
    private String priorityLevel; // "URGENT" (Hôm nay), "HIGH" (Ngày mai), "NORMAL"

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
