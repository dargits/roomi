package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.BookingRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.BookingResponse;
import roomi.dev.model.User;
import roomi.dev.service.BookingService;
import roomi.dev.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BookingController {

    private final BookingService bookingService;
    private final AuthUtil       authUtil;

    // ------------------------------------------------------------------ QUERIES & SEARCH

    @GetMapping
    public ResponseEntity<BaseResponse<List<BookingResponse>>> getAllBookings() {
        return ResponseEntity.ok(BaseResponse.<List<BookingResponse>>builder()
                .mess("Thành công")
                .data(bookingService.getAllBookings())
                .build());
    }

    @GetMapping("/search")
    public ResponseEntity<BaseResponse<List<BookingResponse>>> searchBookings(
            @RequestParam(required = false) String guestName,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String idNumber,
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        
        List<BookingResponse> results = bookingService.searchBookings(guestName, phone, idNumber, roomTypeId, fromDate, toDate);
        return ResponseEntity.ok(BaseResponse.<List<BookingResponse>>builder()
                .mess("Tìm kiếm thành công")
                .data(results)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<BookingResponse>> getBookingById(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Thành công")
                .data(bookingService.getBookingById(id))
                .build());
    }

    @GetMapping("/guest/{guestId}")
    public ResponseEntity<BaseResponse<List<BookingResponse>>> getByGuest(@PathVariable Long guestId) {
        return ResponseEntity.ok(BaseResponse.<List<BookingResponse>>builder()
                .mess("Thành công")
                .data(bookingService.getBookingsByGuest(guestId))
                .build());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<BaseResponse<List<BookingResponse>>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(BaseResponse.<List<BookingResponse>>builder()
                .mess("Thành công")
                .data(bookingService.getBookingsByStatus(status))
                .build());
    }

    // ------------------------------------------------------------------ CREATE / UPDATE / DELETE

    @PostMapping
    public ResponseEntity<BaseResponse<BookingResponse>> createBooking(
            @RequestHeader(value = "Authorization", required = false) String token,
            @Valid @RequestBody BookingRequest request) {
        User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                BaseResponse.<BookingResponse>builder()
                        .mess("Tạo booking thành công")
                        .data(bookingService.createBooking(request, currentUser))
                        .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<BookingResponse>> updateBooking(
            @PathVariable Long id,
            @Valid @RequestBody BookingRequest request) {
        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Cập nhật booking thành công")
                .data(bookingService.updateBooking(id, request))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteBooking(@PathVariable Long id) {
        bookingService.deleteBooking(id);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa booking thành công")
                .build());
    }

    // ------------------------------------------------------------------ ASSIGN ROOM & TRANSITIONS

    @PatchMapping("/{id}/assign-room")
    public ResponseEntity<BaseResponse<BookingResponse>> assignRoom(
            @PathVariable Long id,
            @RequestParam Long roomId) {
        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Gán phòng thành công")
                .data(bookingService.assignRoom(id, roomId))
                .build());
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<BaseResponse<BookingResponse>> confirmBooking(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Xác nhận booking thành công")
                .data(bookingService.confirmBooking(id))
                .build());
    }

    @PatchMapping("/{id}/check-in")
    public ResponseEntity<BaseResponse<BookingResponse>> checkIn(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Check-in thành công")
                .data(bookingService.checkIn(id))
                .build());
    }

    @PatchMapping("/{id}/check-out")
    public ResponseEntity<BaseResponse<BookingResponse>> checkOut(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Check-out thành công")
                .data(bookingService.checkOut(id))
                .build());
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<BaseResponse<BookingResponse>> cancelBooking(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Huỷ booking thành công")
                .data(bookingService.cancelBooking(id))
                .build());
    }
}