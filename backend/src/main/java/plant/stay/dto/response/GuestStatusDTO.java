package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class GuestStatusDTO {
    private Long bookingId;
    private Long guestId;
    private String guestName;
    private String phone;
    /** Số CCCD/hộ chiếu — đã được mask theo vai trò người dùng (QTN-24) */
    private String idNumber;
    /** true nếu idNumber đang ở dạng đã che (****XXXX), false nếu hiển thị đầy đủ */
    private boolean idNumberMasked;
    private String roomNumber;
    private LocalDateTime checkedInAt;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private String documentStatus;
    private List<String> missingRequirements;
    private List<DocumentDTO> documents;
    private String declarationStatus;
    private LocalDateTime declarationCompletedAt;
    /** Trạng thái đặt phòng: CHECKED_IN, CHECKED_OUT */
    private String bookingStatus;
    /** Quốc tịch — phục vụ mẫu khai báo lưu trú theo quy định */
    private String nationality;
}