package roomi.dev.service.impl;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import roomi.dev.dto.response.DailyRoomStatusResponse;
import roomi.dev.model.Booking;
import roomi.dev.model.Guest;
import roomi.dev.model.Room;
import roomi.dev.model.RoomType;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.RoomRepository;
import roomi.dev.repository.RoomTypeRepository;
import roomi.dev.repository.SeasonalRateRepository;
import roomi.dev.util.time.BookingConflictChecker;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CalendarServiceImpl - trạng thái phòng theo ngày")
class CalendarServiceImplTest {

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RoomTypeRepository roomTypeRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private SeasonalRateRepository seasonalRateRepository;

    @Mock
    private BookingConflictChecker conflictChecker;

    @InjectMocks
    private CalendarServiceImpl calendarService;

    @Test
    @DisplayName("phân loại phòng trống, đang dùng, đã đặt và đang dọn dẹp trong ngày được chọn")
    void getDailyRoomStatuses_classifiesRoomsForSelectedDate() {
        LocalDate date = LocalDate.of(2026, 8, 10);
        RoomType roomType = RoomType.builder().id(1L).name("Deluxe").build();
        Room available = room(1L, "101", roomType, Room.Status.AVAILABLE);
        Room occupied = room(2L, "102", roomType, Room.Status.AVAILABLE);
        Room reserved = room(3L, "103", roomType, Room.Status.AVAILABLE);
        Room cleaning = room(4L, "104", roomType, Room.Status.NEEDS_CLEANING);

        when(roomRepository.findAll()).thenReturn(List.of(available, occupied, reserved, cleaning));
        when(bookingRepository.findActiveBookingsByRoomAndDateRange(1L, date, date.plusDays(1)))
                .thenReturn(List.of());
        when(bookingRepository.findActiveBookingsByRoomAndDateRange(2L, date, date.plusDays(1)))
                .thenReturn(List.of(booking(10L, occupied, roomType, Booking.Status.CHECKED_IN)));
        when(bookingRepository.findActiveBookingsByRoomAndDateRange(3L, date, date.plusDays(1)))
                .thenReturn(List.of(booking(11L, reserved, roomType, Booking.Status.CONFIRMED)));
        when(bookingRepository.findActiveBookingsByRoomAndDateRange(4L, date, date.plusDays(1)))
                .thenReturn(List.of());

        List<DailyRoomStatusResponse> result = calendarService.getDailyRoomStatuses(date);

        assertThat(result)
                .extracting(DailyRoomStatusResponse::getStatus)
                .containsExactly("AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING");
        assertThat(result.get(1).getGuestName()).isEqualTo("Nguyễn Văn A");
        assertThat(result.get(2).getGuestName()).isEqualTo("Nguyễn Văn A");
    }

        @Test
        @DisplayName("không hiển thị phòng đang sử dụng ở ngày tương lai nếu chỉ có booking đã xác nhận")
        void getDailyRoomStatuses_usesFutureReservationInsteadOfCurrentOccupancy() {
                LocalDate futureDate = LocalDate.now().plusDays(7);
                RoomType roomType = RoomType.builder().id(1L).name("Deluxe").build();
                Room room = room(1L, "101", roomType, Room.Status.OCCUPIED);

                when(roomRepository.findAll()).thenReturn(List.of(room));
                when(bookingRepository.findActiveBookingsByRoomAndDateRange(
                                1L, futureDate, futureDate.plusDays(1)))
                                .thenReturn(List.of(booking(10L, room, roomType, Booking.Status.CONFIRMED)));

                List<DailyRoomStatusResponse> result = calendarService.getDailyRoomStatuses(futureDate);

                assertThat(result).singleElement()
                                .extracting(DailyRoomStatusResponse::getStatus)
                                .isEqualTo("RESERVED");
        }

    private Room room(Long id, String roomNumber, RoomType roomType, Room.Status status) {
        return Room.builder()
                .id(id)
                .roomNumber(roomNumber)
                .roomType(roomType)
                .status(status)
                .build();
    }

    private Booking booking(Long id, Room room, RoomType roomType, Booking.Status status) {
        return Booking.builder()
                .id(id)
                .room(room)
                .roomType(roomType)
                .guest(Guest.builder().fullName("Nguyễn Văn A").build())
                .checkInDate(LocalDate.of(2026, 8, 10))
                .checkOutDate(LocalDate.of(2026, 8, 12))
                .status(status)
                .build();
    }
}
