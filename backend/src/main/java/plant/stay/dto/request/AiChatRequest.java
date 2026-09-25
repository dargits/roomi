package plant.stay.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {
    /** Câu hỏi của khách */
    private String message;
    /** Ngày check-in (tùy chọn, để AI biết phòng trống) */
    private LocalDate checkIn;
    /** Ngày check-out (tùy chọn) */
    private LocalDate checkOut;
}
