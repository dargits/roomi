package plant.stay.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để gửi tin nhắn thử nghiệm kiểm tra kết nối Telegram Bot.
 * Cho phép truyền trực tiếp botToken và chatIds từ form cài đặt để thử nghiệm trước khi lưu DB.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelegramTestRequest {
    private String botToken;
    private String chatIds;
    private String message;
}
