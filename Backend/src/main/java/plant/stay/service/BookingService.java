package plant.stay.service;

import plant.stay.dto.request.BookingRequest;
import plant.stay.dto.request.ExtendStayRequest;
import plant.stay.dto.request.RescheduleDateRequest;
import plant.stay.dto.request.UpgradeRoomRequest;
import plant.stay.dto.response.BookingResponse;
import plant.stay.dto.response.RescheduleDatePreviewResponse;
import plant.stay.model.User;

import java.time.LocalDate;
import java.util.List;

public interface BookingService {
    List<BookingResponse> getAll();
    BookingResponse getById(Long id);
    List<?> getCalendar(LocalDate from, LocalDate to);
    BookingResponse create(BookingRequest request, User actor);
    BookingResponse assignRoom(Long bookingId, Long roomId, User actor);
    BookingResponse cancel(Long bookingId, User actor);
    BookingResponse changeRoom(Long bookingId, Long newRoomId, User actor);
    BookingResponse noShow(Long bookingId, User actor);
    BookingResponse checkIn(Long bookingId, User actor);
    BookingResponse checkIn(Long bookingId, plant.stay.dto.request.CheckInRequest req, User actor);
    List<BookingResponse> bulkCheckIn(plant.stay.dto.request.BulkCheckInRequest req, User actor);
    BookingResponse checkOut(Long bookingId, User actor);
    // NCL-04-CN-007: Gia hạn thêm đêm giữa kỳ lưu trú
    BookingResponse extendStay(Long bookingId, ExtendStayRequest req, User actor);
    // NCL-04-CN-008: Nâng/hạ hạng phòng giữa kỳ lưu trú
    BookingResponse upgradeRoom(Long bookingId, UpgradeRoomRequest req, User actor);
    // Trả về thông tin kiểm tra khả dụng gia hạn
    java.util.Map<String, Object> checkExtendAvailability(Long bookingId, int nights);

    // NCL-04-CN-NEW: Dời lịch đặt phòng chưa nhận phòng (NEW/CONFIRMED)
    // Preview: kiểm tra conflict + tính giá/cọc — KHÔNG lưu DB
    RescheduleDatePreviewResponse previewReschedule(Long bookingId, RescheduleDateRequest req);
    // Confirm: lưu ngày mới vào DB (atomic, validate lại)
    BookingResponse confirmReschedule(Long bookingId, RescheduleDateRequest req, User actor);
}
