package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.BookingRequest;
import roomi.dev.dto.request.ChangeRoomRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.BookingResponse;
import roomi.dev.model.User;
import roomi.dev.service.BookingService;
import roomi.dev.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller quản lý toàn bộ vòng đời đặt phòng.
 *
 * Base URL: /api/v1/bookings
 *
 * Luồng nghiệp vụ chính (system-workflows.md §2):
 *   1. Lễ tân tạo đặt phòng → trạng thái MOI_TAO (NEW)
 *   2. Gán phòng cụ thể     → trạng thái DA_XAC_NHAN (CONFIRMED)
 *   3. Khách đến check-in   → trạng thái DA_NHAN_PHONG (CHECKED_IN)
 *   4. Khách trả phòng      → trạng thái DA_TRA_PHONG (CHECKED_OUT)
 *
 * Các tình huống đặc biệt:
 *   - Hủy đặt phòng (CANCELLED)  — §3.2
 *   - Khách không đến (NO_SHOW)   — §3.1
 *   - Đổi phòng (giữ CONFIRMED hoặc CHECKED_IN) — §3.3
 *
 * Phân quyền:
 *   - Xem booking       : OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
 *   - Tạo/sửa booking   : OWNER, RECEPTIONIST
 *   - Xóa booking       : OWNER, ADMIN
 *   - Gán phòng         : OWNER, RECEPTIONIST
 *   - Check-in/out      : OWNER, RECEPTIONIST
 *   - Hủy / No-show     : OWNER, RECEPTIONIST
 *   - Cổng công khai    : không cần token (khách tự đặt)
 *
 * Endpoints:
 *   GET    /api/v1/bookings                   — danh sách tất cả booking
 *   GET    /api/v1/bookings/search            — tìm kiếm nâng cao
 *   GET    /api/v1/bookings/{id}              — chi tiết một booking
 *   GET    /api/v1/bookings/guest/{guestId}   — booking theo khách
 *   GET    /api/v1/bookings/status/{status}   — booking theo trạng thái
 *   POST   /api/v1/bookings                   — tạo booking (nhân viên)
 *   POST   /api/v1/bookings/public            — tạo booking (khách, public)
 *   PUT    /api/v1/bookings/{id}              — sửa thông tin booking
 *   DELETE /api/v1/bookings/{id}              — xóa booking
 *   PATCH  /api/v1/bookings/{id}/assign-room  — gán phòng cụ thể
 *   PATCH  /api/v1/bookings/{id}/confirm      — xác nhận booking
 *   PATCH  /api/v1/bookings/{id}/check-in     — nhận phòng
 *   PATCH  /api/v1/bookings/{id}/check-out    — trả phòng
 *   PATCH  /api/v1/bookings/{id}/cancel       — hủy booking
 *   PATCH  /api/v1/bookings/{id}/no-show      — đánh dấu khách không đến
 *   PATCH  /api/v1/bookings/{id}/change-room  — đổi phòng
 */
@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BookingController {

    private final BookingService bookingService;
    private final AuthUtil       authUtil;

    // ------------------------------------------------------------------ QUERIES & SEARCH

    /**
     * Lấy danh sách toàn bộ booking, sắp xếp theo ID tăng dần.
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
     *
     * Ví dụ: GET /api/v1/bookings
     */
    @GetMapping
    public ResponseEntity<BaseResponse<List<BookingResponse>>> getAllBookings(
            @RequestHeader("Authorization") String token) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST,
                User.Role.ACCOUNTANT);

        return ResponseEntity.ok(BaseResponse.<List<BookingResponse>>builder()
                .mess("Thành công")
                .data(bookingService.getAllBookings(currentUser))
                .build());
    }

    /**
     * Tìm kiếm booking theo nhiều tiêu chí (tên khách, SĐT, CCCD, loại phòng, khoảng ngày).
     * Tất cả tham số đều tuỳ chọn — bỏ trống = không lọc theo tiêu chí đó.
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
     *
     * Ví dụ: GET /api/v1/bookings/search?guestName=Nguyễn&fromDate=2026-08-01
     */
    @GetMapping("/search")
    public ResponseEntity<BaseResponse<List<BookingResponse>>> searchBookings(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) String guestName,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String idNumber,
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST,
                User.Role.ACCOUNTANT);

        List<BookingResponse> results = bookingService.searchBookings(
                guestName, phone, idNumber, roomTypeId, fromDate, toDate, currentUser);

        return ResponseEntity.ok(BaseResponse.<List<BookingResponse>>builder()
                .mess("Tìm kiếm thành công")
                .data(results)
                .build());
    }

    /**
     * Lấy chi tiết một booking theo ID.
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
     *
     * Ví dụ: GET /api/v1/bookings/42
     */
    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<BookingResponse>> getBookingById(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST,
                User.Role.ACCOUNTANT);

        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Thành công")
                .data(bookingService.getBookingById(id, currentUser))
                .build());
    }

    /**
     * Lấy tất cả booking của một khách hàng cụ thể (lịch sử lưu trú).
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
     *
     * Ví dụ: GET /api/v1/bookings/guest/7
     */
    @GetMapping("/guest/{guestId}")
    public ResponseEntity<BaseResponse<List<BookingResponse>>> getByGuest(
            @RequestHeader("Authorization") String token,
            @PathVariable Long guestId) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST,
                User.Role.ACCOUNTANT);

        return ResponseEntity.ok(BaseResponse.<List<BookingResponse>>builder()
                .mess("Thành công")
                .data(bookingService.getBookingsByGuest(guestId, currentUser))
                .build());
    }

    /**
     * Lọc booking theo trạng thái.
     * Các giá trị hợp lệ: NEW, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
     *
     * Ví dụ: GET /api/v1/bookings/status/CHECKED_IN
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<BaseResponse<List<BookingResponse>>> getByStatus(
            @RequestHeader("Authorization") String token,
            @PathVariable String status) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST,
                User.Role.ACCOUNTANT, User.Role.HOUSEKEEPER);

        return ResponseEntity.ok(BaseResponse.<List<BookingResponse>>builder()
                .mess("Thành công")
                .data(bookingService.getBookingsByStatus(status, currentUser))
                .build());
    }

    // ------------------------------------------------------------------ CREATE / UPDATE / DELETE

    /**
     * Tạo đặt phòng mới (dành cho lễ tân/chủ cơ sở).
     * Trạng thái sau tạo: NEW (nếu chưa gán phòng) hoặc CONFIRMED (nếu đã có roomId).
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: POST /api/v1/bookings
     * Body: { "fullName": "Nguyen A", "phone": "0901...", "roomTypeId": 2,
     *         "checkInDate": "2026-08-10", "checkOutDate": "2026-08-13" }
     */
    @PostMapping
    public ResponseEntity<BaseResponse<BookingResponse>> createBooking(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody BookingRequest request) {

        User currentUser = authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                BaseResponse.<BookingResponse>builder()
                        .mess("Tạo booking thành công")
                        .data(bookingService.createBooking(request, currentUser))
                        .build());
    }

    /**
     * Tạo đặt phòng công khai — dùng cho cổng đặt phòng trực tiếp của khách (NCL-09).
     * Không yêu cầu đăng nhập; createdBy sẽ được set null trong service.
     * Trạng thái sau tạo: NEW (chờ lễ tân duyệt và gán phòng).
     *
     * Ví dụ: POST /api/v1/bookings/public
     */
    @PostMapping("/public")
    public ResponseEntity<BaseResponse<BookingResponse>> createPublicBooking(
            @Valid @RequestBody BookingRequest request) {

        // Endpoint công khai — khách đặt từ web. Đơn khởi tạo trạng thái NEW (Chờ lễ tân duyệt)
        return ResponseEntity.status(HttpStatus.CREATED).body(
                BaseResponse.<BookingResponse>builder()
                        .mess("Gửi yêu cầu đặt phòng thành công. Vui lòng chờ lễ tân kiểm tra và xác nhận.")
                        .data(bookingService.createPublicBooking(request))
                        .build());
    }

    /**
     * Cập nhật thông tin booking (khách, ngày, loại phòng).
     * Không dùng để thay đổi trạng thái — dùng các PATCH endpoint riêng.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: PUT /api/v1/bookings/42
     */
    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<BookingResponse>> updateBooking(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody BookingRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Cập nhật booking thành công")
                .data(bookingService.updateBooking(id, request))
                .build());
    }

    /**
     * Xóa vĩnh viễn booking khỏi hệ thống.
     * Nếu booking đang giữ phòng (CONFIRMED/CHECKED_IN), phòng sẽ được trả về AVAILABLE.
     * Quyền: OWNER, ADMIN (không cho RECEPTIONIST xóa dữ liệu)
     *
     * Ví dụ: DELETE /api/v1/bookings/42
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteBooking(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token, User.Role.OWNER);

        bookingService.deleteBooking(id);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa booking thành công")
                .build());
    }

    // ------------------------------------------------------------------ ASSIGN ROOM & TRANSITIONS

    /**
     * Gán phòng cụ thể cho booking (Luồng §2.1B).
     * Điều kiện: booking phải ở trạng thái NEW hoặc CONFIRMED.
     * Hệ thống tự động kiểm tra chống trùng lịch (§5.1).
     * Sau gán: trạng thái booking → CONFIRMED.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: PATCH /api/v1/bookings/42/assign-room?roomId=5
     */
    @PatchMapping("/{id}/assign-room")
    public ResponseEntity<BaseResponse<BookingResponse>> assignRoom(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @RequestParam Long roomId) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Gán phòng thành công")
                .data(bookingService.assignRoom(id, roomId))
                .build());
    }

    /**
     * Đổi sang phòng khác (Luồng §3.3).
     * Điều kiện: booking đang CONFIRMED hoặc CHECKED_IN.
     * Hệ thống tính lại giá nếu khác loại phòng.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: PATCH /api/v1/bookings/42/change-room
     * Body: { "roomId": 7 }
     */
    @PatchMapping("/{id}/change-room")
    public ResponseEntity<BaseResponse<BookingResponse>> changeRoom(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody ChangeRoomRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Đổi phòng thành công")
                .data(bookingService.changeRoom(id, request))
                .build());
    }

    /**
     * Xác nhận booking (chuyển NEW → CONFIRMED mà không gán phòng cụ thể).
     * Dùng khi lễ tân muốn xác nhận trước, gán phòng sau.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: PATCH /api/v1/bookings/42/confirm
     */
    @PatchMapping("/{id}/confirm")
    public ResponseEntity<BaseResponse<BookingResponse>> confirmBooking(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Xác nhận booking thành công")
                .data(bookingService.confirmBooking(id))
                .build());
    }

    /**
     * Nhận phòng — check-in (Luồng §2.2).
     * Điều kiện tiên quyết:
     *   - Booking ở trạng thái CONFIRMED
     *   - Booking đã có phòng cụ thể (đã assign-room)
     * Sau check-in: booking → CHECKED_IN, phòng → OCCUPIED.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: PATCH /api/v1/bookings/42/check-in
     */
    @PatchMapping("/{id}/check-in")
    public ResponseEntity<BaseResponse<BookingResponse>> checkIn(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Check-in thành công")
                .data(bookingService.checkIn(id))
                .build());
    }

    /**
     * Trả phòng — check-out (Luồng §2.4D).
     * Điều kiện: booking phải ở trạng thái CHECKED_IN.
     * Sau check-out: booking → CHECKED_OUT, phòng → NEEDS_CLEANING.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: PATCH /api/v1/bookings/42/check-out
     */
    @PatchMapping("/{id}/check-out")
    public ResponseEntity<BaseResponse<BookingResponse>> checkOut(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Check-out thành công")
                .data(bookingService.checkOut(id))
                .build());
    }

    /**
     * Hủy đặt phòng (Luồng §3.2).
     * Điều kiện: booking chưa ở trạng thái CHECKED_IN hoặc CHECKED_OUT.
     * Nếu đã gán phòng, phòng sẽ được giải phóng về AVAILABLE.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: PATCH /api/v1/bookings/42/cancel
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<BaseResponse<BookingResponse>> cancelBooking(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Huỷ booking thành công")
                .data(bookingService.cancelBooking(id))
                .build());
    }

    /**
     * Đánh dấu khách không đến (Luồng §3.1).
     * Điều kiện: booking phải ở trạng thái CONFIRMED.
     * Phòng đã gán sẽ được giải phóng về AVAILABLE.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: PATCH /api/v1/bookings/42/no-show
     */
    @PatchMapping("/{id}/no-show")
    public ResponseEntity<BaseResponse<BookingResponse>> markNoShow(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.ok(BaseResponse.<BookingResponse>builder()
                .mess("Đã đánh dấu khách không đến và giải phóng phòng")
                .data(bookingService.markNoShow(id))
                .build());
    }
}