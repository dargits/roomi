package roomi.dev.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.response.AvailableRoomResponse;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.DailyRoomStatusResponse;
import roomi.dev.dto.response.RoomCalendarResponse;
import roomi.dev.service.CalendarService;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller cung cấp API lịch đặt phòng (calendar view) và tìm phòng trống.
 *
 * Base URL: /api/v1/calendar
 *
 * Endpoints:
 *   GET /api/v1/calendar/rooms/{roomId}               — lịch của 1 phòng
 *   GET /api/v1/calendar/rooms                        — lịch tất cả phòng
 *   GET /api/v1/calendar/room-types/{roomTypeId}      — lịch theo loại phòng
 *   GET /api/v1/calendar/available-rooms              — danh sách phòng còn trống + giá
 *   GET /api/v1/calendar/daily-room-statuses          — trạng thái phòng trong một ngày
 */
@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CalendarController {

    private final CalendarService calendarService;

    // ------------------------------------------------------------------ CALENDAR VIEW

    /**
     * Lấy lịch đặt phòng của một phòng cụ thể.
     *
     * Ví dụ: GET /api/v1/calendar/rooms/3?checkIn=2026-08-01&checkOut=2026-08-31
     *
     * @param roomId    ID phòng cần xem lịch
     * @param checkIn   Ngày bắt đầu khoảng xem (format: yyyy-MM-dd)
     * @param checkOut  Ngày kết thúc khoảng xem (format: yyyy-MM-dd)
     */
    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<BaseResponse<RoomCalendarResponse>> getRoomCalendar(
            @PathVariable Long roomId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {

        return ResponseEntity.ok(BaseResponse.<RoomCalendarResponse>builder()
                .mess("Thành công")
                .data(calendarService.getRoomCalendar(roomId, checkIn, checkOut))
                .build());
    }

    /**
     * Lấy lịch đặt phòng của toàn bộ phòng trong khách sạn.
     *
     * Ví dụ: GET /api/v1/calendar/rooms?checkIn=2026-08-01&checkOut=2026-08-31
     *
     * @param checkIn   Ngày bắt đầu khoảng xem (format: yyyy-MM-dd)
     * @param checkOut  Ngày kết thúc khoảng xem (format: yyyy-MM-dd)
     */
    @GetMapping("/rooms")
    public ResponseEntity<BaseResponse<List<RoomCalendarResponse>>> getAllRoomsCalendar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {

        return ResponseEntity.ok(BaseResponse.<List<RoomCalendarResponse>>builder()
                .mess("Thành công")
                .data(calendarService.getAllRoomsCalendar(checkIn, checkOut))
                .build());
    }

    /**
     * Lấy lịch đặt phòng của tất cả phòng thuộc một loại phòng.
     *
     * Ví dụ: GET /api/v1/calendar/room-types/2?checkIn=2026-08-01&checkOut=2026-08-31
     *
     * @param roomTypeId ID loại phòng
     * @param checkIn    Ngày bắt đầu khoảng xem (format: yyyy-MM-dd)
     * @param checkOut   Ngày kết thúc khoảng xem (format: yyyy-MM-dd)
     */
    @GetMapping("/room-types/{roomTypeId}")
    public ResponseEntity<BaseResponse<List<RoomCalendarResponse>>> getRoomCalendarByType(
            @PathVariable Long roomTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {

        return ResponseEntity.ok(BaseResponse.<List<RoomCalendarResponse>>builder()
                .mess("Thành công")
                .data(calendarService.getRoomCalendarByType(roomTypeId, checkIn, checkOut))
                .build());
    }

    // ------------------------------------------------------------------ AVAILABLE ROOMS

    /**
     * Tìm danh sách phòng còn trống trong khoảng thời gian, kèm giá dự kiến.
     * Kết quả được dùng để chọn phòng khi gán vào booking (assign-room).
     *
     * Ví dụ: GET /api/v1/calendar/available-rooms?checkIn=2026-08-10&checkOut=2026-08-15
     *        GET /api/v1/calendar/available-rooms?roomTypeId=2&checkIn=2026-08-10&checkOut=2026-08-15
     *
     * @param roomTypeId (tuỳ chọn) lọc theo loại phòng; null = tìm tất cả loại
     * @param checkIn    Ngày check-in (format: yyyy-MM-dd)
     * @param checkOut   Ngày check-out (format: yyyy-MM-dd)
     */
    @GetMapping("/available-rooms")
    public ResponseEntity<BaseResponse<List<AvailableRoomResponse>>> getAvailableRooms(
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {

        return ResponseEntity.ok(BaseResponse.<List<AvailableRoomResponse>>builder()
                .mess("Thành công")
                .data(calendarService.getAvailableRooms(roomTypeId, checkIn, checkOut))
                .build());
    }

        /**
         * Trạng thái phòng cho một ngày để lễ tân theo dõi: trống, đang sử dụng,
         * đã đặt trước, đang dọn dẹp hoặc bảo trì.
         *
         * Ví dụ: GET /api/v1/calendar/daily-room-statuses?date=2026-08-10
         */
        @GetMapping("/daily-room-statuses")
        public ResponseEntity<BaseResponse<List<DailyRoomStatusResponse>>> getDailyRoomStatuses(
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

                return ResponseEntity.ok(BaseResponse.<List<DailyRoomStatusResponse>>builder()
                                .mess("Thành công")
                                .data(calendarService.getDailyRoomStatuses(date))
                                .build());
        }
}
