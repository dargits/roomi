package plant.stay.service;

import plant.stay.dto.request.BookingRequest;
import plant.stay.dto.response.BookingResponse;
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
    BookingResponse checkOut(Long bookingId, User actor);
}
