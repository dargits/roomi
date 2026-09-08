package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomStayGuestResponseDto {
    private Long id;
    private Long bookingId;
    private String fullName;
    private Integer birthYear;
    private String documentType;
    private String documentNumber; // Đã áp dụng quy tắc che thông tin theo vai trò
    private Boolean isChild;
    private Boolean isPrimaryGuest;
    private LocalDateTime checkInAt;
    private LocalDateTime leftEarlyAt;
    private Boolean isExported;
    private Boolean isCurrentlyStaying;
}
