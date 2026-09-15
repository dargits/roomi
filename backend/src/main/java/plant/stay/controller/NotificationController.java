package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Booking;
import plant.stay.model.NotificationType;
import plant.stay.model.User;
import plant.stay.repository.BookingRepository;
import plant.stay.service.NotificationService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin("*")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final BookingRepository bookingRepository;
    private final AuthUtil authUtil;

    /** Badge count - so thong bao chua doc */
    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(HttpServletRequest request) {
        User user = requireAuth(request);
        long count = notificationService.countUnread(user.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    /** Lay 5 thong bao moi nhat cho dropdown bell */
    @GetMapping("/latest")
    public ResponseEntity<?> latest(HttpServletRequest request) {
        User user = requireAuth(request);
        return ResponseEntity.ok(notificationService.getLatest5(user.getId()));
    }

    /** Lay danh sach thong bao phan trang, loc theo type va read/unread */
    @GetMapping
    public ResponseEntity<?> list(
            HttpServletRequest request,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        User user = requireAuth(request);
        NotificationType typeFilter = null;
        if (type != null && !type.isBlank()) {
            try { typeFilter = NotificationType.valueOf(type); } catch (IllegalArgumentException ignored) {}
        }
        Pageable pageable = PageRequest.of(page, size);
        Page<?> result = notificationService.getMyNotifications(user.getId(), typeFilter, unreadOnly, pageable);
        return ResponseEntity.ok(result);
    }

    /** Danh dau 1 thong bao da doc */
    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id, HttpServletRequest request) {
        User user = requireAuth(request);
        notificationService.markRead(user.getId(), id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /** Danh dau tat ca thong bao da doc */
    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllRead(HttpServletRequest request) {
        User user = requireAuth(request);
        notificationService.markAllRead(user.getId());
        return ResponseEntity.ok(Map.of("success", true));
    }

    /** Lay tuy chon thong bao cua user hien tai */
    @GetMapping("/preferences")
    public ResponseEntity<?> getPreferences(HttpServletRequest request) {
        User user = requireAuth(request);
        List<Map<String, Object>> prefs = notificationService.getUserPreferences(user.getId(), user.getRole());
        return ResponseEntity.ok(prefs);
    }

    /** Cap nhat tuy chon thong bao */
    @PutMapping("/preferences")
    public ResponseEntity<?> updatePreference(
            HttpServletRequest request,
            @RequestBody Map<String, Object> body
    ) {
        User user = requireAuth(request);
        String typeStr = (String) body.get("type");
        Boolean enabled = (Boolean) body.get("enabled");
        if (typeStr == null || enabled == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thieu truong 'type' hoac 'enabled'"));
        }
        NotificationType type;
        try { type = NotificationType.valueOf(typeStr); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", "Loai thong bao khong hop le")); }
        notificationService.updateUserPreference(user.getId(), type, enabled);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /** Lay danh sach check-in / check-out trong ngay (backward compatibility cho Dashboard) */
    @GetMapping("/today-checkinout")
    public ResponseEntity<?> todayCheckInOut(HttpServletRequest request) {
        requireAuth(request);
        LocalDate today = LocalDate.now();
        List<Booking> list = bookingRepository.findTodayCheckinCheckout(today);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Booking b : list) {
            if (b.getCheckInDate() != null && b.getCheckInDate().equals(today)) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("bookingId", b.getId());
                item.put("guestName", b.getGuest() != null ? b.getGuest().getName() : null);
                item.put("guestPhone", b.getGuest() != null ? b.getGuest().getPhone() : null);
                item.put("roomNumber", b.getRoom() != null ? b.getRoom().getRoomNumber() : null);
                item.put("roomTypeName", b.getRoomType() != null ? b.getRoomType().getName() : (b.getRoom() != null && b.getRoom().getRoomType() != null ? b.getRoom().getRoomType().getName() : null));
                item.put("type", "checkin");
                item.put("checkInDate", b.getCheckInDate());
                item.put("checkOutDate", b.getCheckOutDate());
                item.put("status", b.getStatus() != null ? b.getStatus().name() : null);
                result.add(item);
            }
            if (b.getCheckOutDate() != null && b.getCheckOutDate().equals(today)) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("bookingId", b.getId());
                item.put("guestName", b.getGuest() != null ? b.getGuest().getName() : null);
                item.put("guestPhone", b.getGuest() != null ? b.getGuest().getPhone() : null);
                item.put("roomNumber", b.getRoom() != null ? b.getRoom().getRoomNumber() : null);
                item.put("roomTypeName", b.getRoomType() != null ? b.getRoomType().getName() : (b.getRoom() != null && b.getRoom().getRoomType() != null ? b.getRoom().getRoomType().getName() : null));
                item.put("type", "checkout");
                item.put("checkInDate", b.getCheckInDate());
                item.put("checkOutDate", b.getCheckOutDate());
                item.put("status", b.getStatus() != null ? b.getStatus().name() : null);
                result.add(item);
            }
        }
        return ResponseEntity.ok(result);
    }

    // ------------------------------------------------------------------
    private User requireAuth(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Chua dang nhap");
        return user;
    }
}
