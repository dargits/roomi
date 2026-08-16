package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.BookingRequest;
import plant.stay.dto.request.ExtendStayRequest;
import plant.stay.dto.request.UpgradeRoomRequest;
import plant.stay.dto.response.BookingResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.BookingService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/bookings")
@CrossOrigin("*")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<BookingResponse>> getAll(HttpServletRequest request) {
        checkReadBooking(request);
        return ResponseEntity.ok(bookingService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getById(@PathVariable Long id, HttpServletRequest request) {
        checkReadBooking(request);
        return ResponseEntity.ok(bookingService.getById(id));
    }

    // Lịch phòng — dữ liệu cho giao diện lưới
    @GetMapping("/calendar")
    public ResponseEntity<?> getCalendar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletRequest request) {
        checkReadBooking(request);
        return ResponseEntity.ok(bookingService.getCalendar(from, to));
    }

    @PostMapping
    public ResponseEntity<BookingResponse> create(@Valid @RequestBody BookingRequest req,
                                                  HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.create(req, actor));
    }

    // Gán phòng vào booking
    @PutMapping("/{id}/assign-room")
    public ResponseEntity<BookingResponse> assignRoom(@PathVariable Long id,
                                                      @RequestParam Long roomId,
                                                      HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.assignRoom(id, roomId, actor));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancel(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.cancel(id, actor));
    }

    @PutMapping("/{id}/change-room")
    public ResponseEntity<BookingResponse> changeRoom(@PathVariable Long id,
                                                      @RequestParam Long newRoomId,
                                                      HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.changeRoom(id, newRoomId, actor));
    }

    @PutMapping("/{id}/no-show")
    public ResponseEntity<BookingResponse> noShow(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.noShow(id, actor));
    }

    @PutMapping("/{id}/check-in")
    public ResponseEntity<BookingResponse> checkIn(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.checkIn(id, actor));
    }

    @PutMapping("/{id}/check-out")
    public ResponseEntity<BookingResponse> checkOut(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.checkOut(id, actor));
    }

    // NCL-04-CN-007: Gia hạn thêm đêm giữa kỳ lưu trú (QTN-22)
    @PutMapping("/{id}/extend-stay")
    public ResponseEntity<BookingResponse> extendStay(@PathVariable Long id,
                                                       @Valid @RequestBody ExtendStayRequest req,
                                                       HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.extendStay(id, req, actor));
    }

    // NCL-04-CN-008: Nâng hạng phòng giữa kỳ lưu trú (QTN-22)
    @PutMapping("/{id}/upgrade-room")
    public ResponseEntity<BookingResponse> upgradeRoom(@PathVariable Long id,
                                                        @Valid @RequestBody UpgradeRoomRequest req,
                                                        HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.upgradeRoom(id, req, actor));
    }

    // NCL-04-CN-007: Kiểm tra khả dụng gia hạn
    @GetMapping("/{id}/extend-availability")
    public ResponseEntity<?> checkExtendAvailability(@PathVariable Long id,
                                                      @RequestParam int nights,
                                                      HttpServletRequest request) {
        checkReadBooking(request);
        return ResponseEntity.ok(bookingService.checkExtendAvailability(id, nights));
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER
                && user.getRole() != Role.RECEPTIONIST
                && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Không có quyền truy cập");
        return user;
    }

    private User checkReadBooking(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER
                && user.getRole() != Role.RECEPTIONIST
                && user.getRole() != Role.ADMIN
                && user.getRole() != Role.ACCOUNTANT))
            throw new UnauthorizedException("Không có quyền truy cập");
        return user;
    }
}
