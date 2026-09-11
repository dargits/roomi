package plant.stay.service;

import plant.stay.dto.request.RoomStayGuestCreateDto;
import plant.stay.dto.response.RoomStayGuestResponseDto;
import plant.stay.dto.response.StayingGuestsSummaryDto;
import plant.stay.model.User;

import java.util.List;

public interface RoomStayGuestService {
    List<RoomStayGuestResponseDto> getStayingGuests(Long bookingId, User actor);
    StayingGuestsSummaryDto getStayingGuestsSummary(Long bookingId, User actor);
    RoomStayGuestResponseDto addStayingGuest(Long bookingId, RoomStayGuestCreateDto dto, User actor);
    RoomStayGuestResponseDto markLeftEarly(Long bookingId, Long guestId, User actor);
    void removeStayingGuest(Long bookingId, Long guestId, User actor);
    void syncBookingSurcharges(Long bookingId, User actor);
}
