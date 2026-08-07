package roomi.dev.service;

import roomi.dev.model.CleaningNotification;
import java.util.List;

public interface CleaningNotificationService {
    
    /**
     * Lấy danh sách thông báo dọn dẹp chưa đọc, đồng thời đồng bộ hóa tự động
     * dựa trên trạng thái phòng thực tế (NEEDS_CLEANING).
     */
    List<CleaningNotification> getUnreadNotifications();

    /**
     * Đánh dấu một thông báo là đã đọc.
     */
    void markAsRead(Long id);

    /**
     * Đánh dấu tất cả thông báo hiện tại là đã đọc.
     */
    void markAllAsRead();
}
