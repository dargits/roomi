package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.BookingRequest;
import plant.stay.dto.request.ExtendStayRequest;
import plant.stay.dto.request.RescheduleDateRequest;
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
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false, defaultValue = "id") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String direction,
            HttpServletRequest request) {
        checkReadBooking(request);
        if (page != null) {
            int pageSize = (size != null && size > 0) ? size : 15;
            Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
            Pageable pageable = PageRequest.of(page, pageSize, Sort.by(dir, sortBy));
            return ResponseEntity.ok(bookingService.getAllPaged(pageable));
        }
        return ResponseEntity.ok(bookingService.getAll());
    }

    // NCL-03-CN-010: Tra cứu nhanh đặt phòng theo mã, tên khách hoặc SĐT
    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) plant.stay.model.BookingStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false, defaultValue = "id") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String direction,
            HttpServletRequest request) {
        checkReadBooking(request);
        if (page != null) {
            int pageSize = (size != null && size > 0) ? size : 15;
            Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
            Pageable pageable = PageRequest.of(page, pageSize, Sort.by(dir, sortBy));
            return ResponseEntity.ok(bookingService.searchPaged(q, status, from, to, pageable));
        }
        return ResponseEntity.ok(bookingService.search(q, status, from, to));
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
    public ResponseEntity<BookingResponse> checkIn(@PathVariable Long id,
                                                  @Valid @RequestBody(required = false) plant.stay.dto.request.CheckInRequest req,
                                                  HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.checkIn(id, req, actor));
    }

    @PutMapping("/bulk-check-in")
    public ResponseEntity<plant.stay.dto.response.BulkCheckInResultResponse> bulkCheckIn(@Valid @RequestBody plant.stay.dto.request.BulkCheckInRequest req,
                                                             HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.bulkCheckIn(req, actor));
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

    // NCL-04-CN-NEW: Xem trước trả phòng sớm (không lưu DB)
    @GetMapping("/{id}/early-checkout-preview")
    public ResponseEntity<?> earlyCheckoutPreview(@PathVariable Long id,
                                                   HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(bookingService.previewEarlyCheckout(id));
    }

    // NCL-04-CN-NEW: Xác nhận trả phòng sớm
    @PutMapping("/{id}/early-checkout")
    public ResponseEntity<BookingResponse> confirmEarlyCheckout(@PathVariable Long id,
                                                                  HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.confirmEarlyCheckout(id, actor));
    }

    // NCL-04-CN-NEW: Preview dời lịch đặt phòng (KHÔNG lưu DB)
    @GetMapping("/{id}/reschedule-preview")
    public ResponseEntity<?> previewReschedule(
            @PathVariable Long id,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate newCheckInDate,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate newCheckOutDate,
            HttpServletRequest request) {
        checkStaff(request);
        RescheduleDateRequest req = new RescheduleDateRequest();
        req.setNewCheckInDate(newCheckInDate);
        req.setNewCheckOutDate(newCheckOutDate);
        return ResponseEntity.ok(bookingService.previewReschedule(id, req));
    }

    // NCL-04-CN-NEW: Xác nhận dời lịch (lưu DB)
    @PutMapping("/{id}/reschedule")
    public ResponseEntity<BookingResponse> confirmReschedule(
            @PathVariable Long id,
            @Valid @RequestBody RescheduleDateRequest req,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.confirmReschedule(id, req, actor));
    }

    // Gửi email nhắc nhận phòng thủ công cho một booking
    @PostMapping("/{id}/send-reminder")
    public ResponseEntity<plant.stay.dto.response.MessageResponse> sendReminder(
            @PathVariable Long id,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.sendCheckInReminderManually(id, actor));
    }

    // Kích hoạt quét và gửi nhắc nhận phòng ngày mai ngay lập tức (dành cho Admin/Owner)
    @PostMapping("/trigger-reminders-job")
    public ResponseEntity<plant.stay.dto.response.MessageResponse> triggerRemindersJob(HttpServletRequest request) {
        checkStaff(request);
        bookingService.sendCheckInRemindersForTomorrow();
        return ResponseEntity.ok(new plant.stay.dto.response.MessageResponse("Đã kích hoạt quét và gửi email nhắc nhận phòng cho ngày mai"));
    }

    // Xác nhận đặt phòng (chuyển trạng thái NEW -> CONFIRMED)
    @PutMapping("/{id}/confirm")
    public ResponseEntity<BookingResponse> confirmBooking(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.confirmBooking(id, actor));
    }

    // Sinh / lấy dữ liệu bản xác nhận đặt phòng
    @GetMapping("/{id}/confirmation")
    public ResponseEntity<plant.stay.dto.response.BookingConfirmationData> getConfirmationData(
            @PathVariable Long id,
            HttpServletRequest request) {
        checkReadBooking(request);
        return ResponseEntity.ok(bookingService.getBookingConfirmationData(id));
    }

    // Gửi xác nhận đặt phòng (qua Email hoặc ghi nhật ký kết xuất tin nhắn Zalo/SMS/In)
    @PostMapping("/{id}/send-confirmation")
    public ResponseEntity<plant.stay.dto.response.BookingConfirmationLogResponse> sendConfirmation(
            @PathVariable Long id,
            @Valid @RequestBody plant.stay.dto.request.SendConfirmationRequest req,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(bookingService.sendOrLogConfirmation(id, req, actor));
    }

    // Lấy lịch sử các lần gửi bản xác nhận đặt phòng
    @GetMapping("/{id}/confirmation-logs")
    public ResponseEntity<List<plant.stay.dto.response.BookingConfirmationLogResponse>> getConfirmationLogs(
            @PathVariable Long id,
            HttpServletRequest request) {
        checkReadBooking(request);
        return ResponseEntity.ok(bookingService.getConfirmationLogs(id));
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
