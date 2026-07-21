package roomi.dev.service;

import roomi.dev.dto.request.BookingRequest;
import roomi.dev.dto.response.BookingResponse;
import roomi.dev.model.User;

import java.util.List;

public interface BookingService {

    /** Tạo booking mới (có thể chưa gán phòng cụ thể) */
    BookingResponse createBooking(BookingRequest request, User createdBy);

    /**
     * Gán phòng cụ thể cho booking đã tồn tại.
     * Kiểm tra:
     *   - roomType của phòng phải khớp booking
     *   - phòng không bị chồng lấn thời gian với booking khác
     *   - tính lại expectedPrice theo SeasonalRate
     */
    BookingResponse assignRoom(Long bookingId, Long roomId);

    /** Xác nhận booking (NEW → CONFIRMED) */
    BookingResponse confirmBooking(Long bookingId);

    /** Check-in (CONFIRMED → CHECKED_IN), đổi trạng thái phòng → OCCUPIED */
    BookingResponse checkIn(Long bookingId);

    /** Check-out (CHECKED_IN → CHECKED_OUT), đổi trạng thái phòng → NEEDS_CLEANING */
    BookingResponse checkOut(Long bookingId);

    /** Huỷ booking, trả phòng về AVAILABLE nếu đã gán */
    BookingResponse cancelBooking(Long bookingId);

    BookingResponse getBookingById(Long id);

    List<BookingResponse> getAllBookings();

    List<BookingResponse> getBookingsByGuest(Long guestId);

    List<BookingResponse> getBookingsByStatus(String status);
}
