package roomi.dev.service;

import roomi.dev.dto.request.BookingRequest;
import roomi.dev.dto.request.ChangeRoomRequest;
import roomi.dev.dto.response.BookingResponse;
import roomi.dev.model.User;

import java.time.LocalDate;
import java.util.List;

public interface BookingService {

    BookingResponse createBooking(BookingRequest request, User createdBy);

    BookingResponse createPublicBooking(BookingRequest request);

    BookingResponse updateBooking(Long id, BookingRequest request);

    void deleteBooking(Long id);

    BookingResponse assignRoom(Long bookingId, Long roomId);

    BookingResponse changeRoom(Long bookingId, ChangeRoomRequest request);

    BookingResponse confirmBooking(Long bookingId);

    BookingResponse checkIn(Long bookingId);

    BookingResponse checkOut(Long bookingId);

    BookingResponse cancelBooking(Long bookingId);

    BookingResponse markNoShow(Long bookingId);

    BookingResponse getBookingById(Long id, User currentUser);

    List<BookingResponse> getAllBookings(User currentUser);

    List<BookingResponse> getBookingsByGuest(Long guestId, User currentUser);

    List<BookingResponse> getBookingsByStatus(String status, User currentUser);

    List<BookingResponse> searchBookings(String guestName, String phone, String idNumber, 
                                         Long roomTypeId, LocalDate fromDate, LocalDate toDate, User currentUser);
}