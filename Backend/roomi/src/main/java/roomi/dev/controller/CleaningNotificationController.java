package roomi.dev.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.model.CleaningNotification;
import roomi.dev.model.User;
import roomi.dev.service.CleaningNotificationService;
import roomi.dev.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cleaning-notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CleaningNotificationController {

    private final CleaningNotificationService cleaningNotificationService;
    private final AuthUtil authUtil;

    /**
     * Lấy danh sách thông báo dọn dẹp chưa đọc dành cho vai trò buồng phòng (HOUSEKEEPER).
     * Quyền: HOUSEKEEPER, OWNER
     */
    @GetMapping
    public ResponseEntity<BaseResponse<List<CleaningNotification>>> getUnreadNotifications(
            @RequestHeader("Authorization") String token) {
        
        authUtil.requireRoles(token, User.Role.HOUSEKEEPER, User.Role.OWNER);

        List<CleaningNotification> notifications = cleaningNotificationService.getUnreadNotifications();
        return ResponseEntity.ok(BaseResponse.<List<CleaningNotification>>builder()
                .mess("Thành công")
                .data(notifications)
                .build());
    }

    /**
     * Đánh dấu một thông báo dọn dẹp cụ thể là đã đọc.
     * Quyền: HOUSEKEEPER, OWNER
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<BaseResponse<Void>> markAsRead(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        
        authUtil.requireRoles(token, User.Role.HOUSEKEEPER, User.Role.OWNER);

        cleaningNotificationService.markAsRead(id);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Đánh dấu đã đọc thành công")
                .build());
    }

    /**
     * Đánh dấu tất cả thông báo dọn dẹp hiện tại là đã đọc.
     * Quyền: HOUSEKEEPER, OWNER
     */
    @PostMapping("/read-all")
    public ResponseEntity<BaseResponse<Void>> markAllAsRead(
            @RequestHeader("Authorization") String token) {
        
        authUtil.requireRoles(token, User.Role.HOUSEKEEPER, User.Role.OWNER);

        cleaningNotificationService.markAllAsRead();
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Đánh dấu tất cả đã đọc thành công")
                .build());
    }
}
