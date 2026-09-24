package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {
    /** Phản hồi từ AI */
    private String reply;
    /** Model đã dùng (informational) */
    private String model;
    /** Cờ báo lỗi */
    private boolean error;
    /** Thông báo lỗi (nếu error=true) */
    private String errorMessage;
}
