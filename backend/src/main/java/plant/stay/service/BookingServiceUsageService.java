package plant.stay.service;

import plant.stay.dto.request.BookingServiceUsageRequest;
import plant.stay.dto.response.BookingServiceUsageResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.model.User;

import java.util.List;

public interface BookingServiceUsageService {
    List<BookingServiceUsageResponse> getByBooking(Long bookingId);
    BookingServiceUsageResponse add(Long bookingId, BookingServiceUsageRequest request, User actor);
    MessageResponse remove(Long bookingId, Long usageId, User actor);
}
