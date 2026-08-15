package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Booking;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.BookingRepository;
import plant.stay.service.impl.BookingServiceImpl;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin("*")
@RequiredArgsConstructor
public class NotificationController {

    private final BookingRepository bookingRepository;
    private final BookingServiceImpl bookingService;
    private final AuthUtil authUtil;

    /**
     * Lấy danh sách check-in / check-out trong ngày.
     *
     * Response format (mảng phẳng, FE dễ xử lý):
     * [
     *   { bookingId, guestName, guestPhone, roomNumber, roomTypeName,
     *     type: "checkin" | "checkout",
     *     checkInDate, checkOutDate }
     * ]
     */
    @GetMapping("/today-checkinout")
    public ResponseEntity<?> todayCheckinCheckout(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER
                && user.getRole() != Role.RECEPTIONIST
                && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Không có quyền truy cập");

        LocalDate today = LocalDate.now();
        List<Booking> bookings = bookingRepository.findTodayCheckinCheckout(today);

        // Tạo mảng phẳng, mỗi sự kiện (checkin, checkout) xuất hiện 1 lần.
        // Nếu cùng ngày check-in VÀ check-out (đặt 1 đêm) → hiển thị cả hai sự kiện.
        List<Map<String, Object>> result = bookings.stream()
                .flatMap(b -> {
                    List<Map<String, Object>> events = new ArrayList<>();
                    if (b.getCheckInDate().equals(today)) {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("bookingId", b.getId());
                        item.put("guestName", b.getGuest().getName());
                        item.put("guestPhone", b.getGuest().getPhone());
                        item.put("roomNumber", b.getRoom() != null ? b.getRoom().getRoomNumber() : null);
                        item.put("roomTypeName", b.getRoomType() != null ? b.getRoomType().getName() : null);
                        item.put("type", "checkin");
                        item.put("checkInDate", b.getCheckInDate().toString());
                        item.put("checkOutDate", b.getCheckOutDate().toString());
                        item.put("status", b.getStatus().name());
                        events.add(item);
                    }
                    if (b.getCheckOutDate().equals(today)) {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("bookingId", b.getId());
                        item.put("guestName", b.getGuest().getName());
                        item.put("guestPhone", b.getGuest().getPhone());
                        item.put("roomNumber", b.getRoom() != null ? b.getRoom().getRoomNumber() : null);
                        item.put("roomTypeName", b.getRoomType() != null ? b.getRoomType().getName() : null);
                        item.put("type", "checkout");
                        item.put("checkInDate", b.getCheckInDate().toString());
                        item.put("checkOutDate", b.getCheckOutDate().toString());
                        item.put("status", b.getStatus().name());
                        events.add(item);
                    }
                    return events.stream();
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
