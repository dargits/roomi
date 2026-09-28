package plant.stay.service;

import java.nio.file.Path;

/**
 * Dịch vụ tự động gửi và lưu trữ tệp sao lưu hệ thống qua Telegram Bot
 */
public interface TelegramBackupService {

    /**
     * Gửi tệp sao lưu lên Telegram Bot kèm thông tin thống kê chi tiết
     * @param filePath Đường dẫn tệp sao lưu (.zip hoặc .sql)
     * @param fileName Tên tệp sao lưu
     * @param caption Ghi chú đính kèm (số bảng, số bản ghi, checksum, người tạo)
     * @return URL tải tệp trực tiếp từ Telegram
     */
    String sendBackupDocument(Path filePath, String fileName, String caption);

    /**
     * Tải nội dung byte của tệp sao lưu từ Telegram Bot API
     * @param fileUrl URL tệp tin Telegram
     * @return Mảng byte dữ liệu của tệp
     */
    byte[] downloadFileBytes(String fileUrl);

    /**
     * Kiểm tra bot đã được cấu hình token và chat ID hay chưa
     */
    boolean isConfigured();

    /**
     * Lấy danh sách các Telegram Chat ID được phép truy cập và nhận bản sao lưu
     */
    java.util.List<String> getAllowedChatIds();

    /**
     * Gửi tin nhắn kiểm tra thử nghiệm tới toàn bộ danh sách Chat ID đã cấu hình
     * @param customMessage Nội dung tin nhắn thử nghiệm
     * @return Thông báo kết quả gửi (số lượng gửi thành công / thất bại)
     */
    String testSendToAll(String customMessage);

    /**
     * Gửi tin nhắn kiểm tra thử nghiệm có thể ghi đè token và danh sách chat ID từ giao diện cài đặt
     * @param overrideToken Bot token truyền từ client (nếu null/rỗng sẽ dùng cấu hình hệ thống)
     * @param overrideChatIds Danh sách Chat ID truyền từ client (nếu null/rỗng sẽ dùng cấu hình hệ thống)
     * @param customMessage Nội dung tin nhắn thử nghiệm
     * @return Thông báo kết quả gửi
     */
    String testSendToAll(String overrideToken, String overrideChatIds, String customMessage);
}
