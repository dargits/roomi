package roomi.dev.service;

import roomi.dev.dto.response.AvailableRoomResponse;
import roomi.dev.dto.response.DailyRoomStatusResponse;
import roomi.dev.dto.response.RoomCalendarResponse;

import java.time.LocalDate;
import java.util.List;

public interface CalendarService {

    /**
     * Lấy lịch đặt phòng (calendar view) của một phòng cụ thể.
     * Trả về thông tin phòng + danh sách booking trong khoảng [checkIn, checkOut).
     *
     * @param roomId   ID phòng
     * @param checkIn  Ngày bắt đầu xem lịch
     * @param checkOut Ngày kết thúc xem lịch
     */
    RoomCalendarResponse getRoomCalendar(Long roomId, LocalDate checkIn, LocalDate checkOut);

    /**
     * Lấy lịch đặt phòng của tất cả phòng trong khách sạn.
     * Dùng cho giao diện calendar tổng quan.
     *
     * @param checkIn  Ngày bắt đầu xem lịch
     * @param checkOut Ngày kết thúc xem lịch
     */
    List<RoomCalendarResponse> getAllRoomsCalendar(LocalDate checkIn, LocalDate checkOut);

    /**
     * Lấy lịch đặt phòng của tất cả phòng thuộc một loại phòng.
     *
     * @param roomTypeId ID loại phòng
     * @param checkIn    Ngày bắt đầu xem lịch
     * @param checkOut   Ngày kết thúc xem lịch
     */
    List<RoomCalendarResponse> getRoomCalendarByType(Long roomTypeId,
                                                     LocalDate checkIn,
                                                     LocalDate checkOut);

    /**
     * Lấy danh sách phòng còn trống (available) trong khoảng thời gian.
     * Kèm theo giá dự kiến tính theo SeasonalRate.
     *
     * @param roomTypeId ID loại phòng (null = tìm tất cả loại)
     * @param checkIn    Ngày check-in
     * @param checkOut   Ngày check-out
     */
    List<AvailableRoomResponse> getAvailableRooms(Long roomTypeId,
                                                  LocalDate checkIn,
                                                  LocalDate checkOut);

    /**
     * Lấy trạng thái vận hành của tất cả phòng trong một ngày.
     * Booking được xét theo khoảng [date, date + 1).
     */
    List<DailyRoomStatusResponse> getDailyRoomStatuses(LocalDate date);
}
