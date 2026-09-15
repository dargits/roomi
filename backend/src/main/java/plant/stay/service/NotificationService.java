package plant.stay.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import plant.stay.dto.response.NotificationResponse;
import plant.stay.model.NotificationType;
import plant.stay.model.Role;

import java.util.List;
import java.util.Map;

public interface NotificationService {

    /** Tao thong bao cho tat ca user thuoc cac role mac dinh cua loai thong bao nay */
    void createForRoles(NotificationType type, String title, String body, String refType, Long refId);

    /** Tao thong bao cho 1 user cu the */
    void createForUser(Long userId, NotificationType type, String title, String body, String refType, Long refId);

    /** Lay danh sach thong bao cua user hien tai (phan trang) */
    Page<NotificationResponse> getMyNotifications(Long userId, NotificationType typeFilter, Boolean unreadOnly, Pageable pageable);

    /** Lay 5 thong bao moi nhat (cho dropdown bell) */
    List<NotificationResponse> getLatest5(Long userId);

    /** Dem so thong bao chua doc */
    long countUnread(Long userId);

    /** Danh dau 1 thong bao da doc */
    void markRead(Long userId, Long notificationId);

    /** Danh dau tat ca da doc */
    void markAllRead(Long userId);

    /** Lay tuy chon cua user (list type + enabled + mandatory) */
    List<Map<String, Object>> getUserPreferences(Long userId, Role userRole);

    /** Cap nhat tuy chon cua user (chi voi loai khong bat buoc) */
    void updateUserPreference(Long userId, NotificationType type, boolean enabled);
}
