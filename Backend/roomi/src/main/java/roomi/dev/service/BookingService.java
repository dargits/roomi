package roomi.dev.service;

import roomi.dev.dto.request.BookingRequest;
import roomi.dev.dto.response.BookingResponse;
import roomi.dev.model.User;

import java.time.LocalDate;
import java.util.List;

public interface BookingService {

    BookingResponse createBooking(BookingRequest request, User createdBy);

    BookingResponse updateBooking(Long id, BookingRequest request);

    void deleteBooking(Long id);

    BookingResponse assignRoom(Long bookingId, Long roomId);

    BookingResponse confirmBooking(Long bookingId);

    BookingResponse checkIn(Long bookingId);

    BookingResponse checkOut(Long bookingId);

    BookingResponse cancelBooking(Long bookingId);

    BookingResponse getBookingById(Long id);

    List<BookingResponse> getAllBookings();

    List<BookingResponse> getBookingsByGuest(Long guestId);

    List<BookingResponse> getBookingsByStatus(String status);

    List<BookingResponse> searchBookings(String guestName, String phone, String idNumber, 
                                         Long roomTypeId, LocalDate fromDate, LocalDate toDate);
}