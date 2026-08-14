package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.response.BookingResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Booking;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.BookingRepository;
import plant.stay.service.impl.BookingServiceImpl;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin("*")
@RequiredArgsConstructor
public class NotificationController {

    private final BookingRepository bookingRepository;
    private final BookingServiceImpl bookingService;
    private final AuthUtil authUtil;

    // Nhắc nhận phòng/trả phòng trong ngày
    @GetMapping("/today-checkinout")
    public ResponseEntity<?> todayCheckinCheckout(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.RECEPTIONIST))
            throw new UnauthorizedException("Không có quyền truy cập");

        LocalDate today = LocalDate.now();
        List<Booking> bookings = bookingRepository.findTodayCheckinCheckout(today);

        return ResponseEntity.ok(java.util.Map.of(
                "date", today.toString(),
                "checkIns", bookings.stream()
                        .filter(b -> b.getCheckInDate().equals(today))
                        .map(bookingService::toResponse)
                        .collect(Collectors.toList()),
                "checkOuts", bookings.stream()
                        .filter(b -> b.getCheckOutDate().equals(today))
                        .map(bookingService::toResponse)
                        .collect(Collectors.toList())
        ));
    }
}
