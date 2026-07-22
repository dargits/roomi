package roomi.dev.util.time;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Booking;
import roomi.dev.model.Room;
import roomi.dev.model.RoomType;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.RoomRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BookingConflictChecker — kiểm tra xung đột lịch gán phòng")
class BookingConflictCheckerTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private RoomRepository roomRepository;

    @InjectMocks
    private BookingConflictChecker conflictChecker;

    // ----- fixtures -----
    private RoomType roomType;
    private Room     room;
    private TimeSlot slot;

    @BeforeEach
    void setUp() {
        roomType = RoomType.builder()
                .id(1L).name("Deluxe").capacity(2)
                .basePrice(new BigDecimal("500000")).build();

        room = Room.builder()
                .id(10L).roomNumber("101").floor("1")
                .roomType(roomType).status(Room.Status.AVAILABLE).build();

        slot = TimeSlot.of(ld("2026-08-10"), ld("2026-08-15"));
    }

    // ====================================================== validateAndGetRoom
    @Nested
    @DisplayName("validateAndGetRoom() — kiểm tra phòng hợp lệ để gán")
    class ValidateAndGetRoom {

        @Test
        @DisplayName("trả về Room khi tất cả hợp lệ (roomType khớp, không conflict)")
        void success_returnsRoom() {
            when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
            when(bookingRepository.existsRoomConflict(10L, slot.getStartDate(), slot.getEndDate(), -1L))
                    .thenReturn(false);

            Room result = conflictChecker.validateAndGetRoom(10L, roomType, slot, -1L);

            assertThat(result).isEqualTo(room);
            verify(bookingRepository).existsRoomConflict(10L, slot.getStartDate(), slot.getEndDate(), -1L);
        }

        @Test
        @DisplayName("ném BusinessException khi roomId không tồn tại")
        void throwsException_whenRoomNotFound() {
            when(roomRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    conflictChecker.validateAndGetRoom(99L, roomType, slot, -1L)
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Không tìm thấy phòng")
            .extracting("errorCode").isEqualTo(ErrorCode.INVALID_INPUT);

            verifyNoInteractions(bookingRepository);
        }

        @Test
        @DisplayName("ném BusinessException khi roomType không khớp")
        void throwsException_whenRoomTypeMismatch() {
            RoomType otherType = RoomType.builder()
                    .id(99L).name("Suite").capacity(4)
                    .basePrice(new BigDecimal("1200000")).build();
            // phòng 101 thuộc "Deluxe" (id=1), nhưng booking yêu cầu "Suite" (id=99)
            when(roomRepository.findById(10L)).thenReturn(Optional.of(room));

            assertThatThrownBy(() ->
                    conflictChecker.validateAndGetRoom(10L, otherType, slot, -1L)
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("101")         // số phòng
            .hasMessageContaining("Deluxe")      // roomType của phòng
            .hasMessageContaining("Suite")       // roomType yêu cầu
            .extracting("errorCode").isEqualTo(ErrorCode.ROOM_TYPE_MISMATCH);

            verifyNoInteractions(bookingRepository);
        }

        @Test
        @DisplayName("ném BusinessException khi phòng bị trùng lịch")
        void throwsException_whenConflictExists() {
            when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
            when(bookingRepository.existsRoomConflict(10L, slot.getStartDate(), slot.getEndDate(), -1L))
                    .thenReturn(true);

            assertThatThrownBy(() ->
                    conflictChecker.validateAndGetRoom(10L, roomType, slot, -1L)
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("101")
            .hasMessageContaining("đã được đặt")
            .extracting("errorCode").isEqualTo(ErrorCode.BOOKING_CONFLICT);
        }

        @Test
        @DisplayName("loại trừ đúng bookingId khi kiểm tra (assign-room cho booking hiện tại)")
        void excludesCurrentBookingId_whenAssigning() {
            long currentBookingId = 42L;
            when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
            when(bookingRepository.existsRoomConflict(
                    10L, slot.getStartDate(), slot.getEndDate(), currentBookingId))
                    .thenReturn(false);

            Room result = conflictChecker.validateAndGetRoom(10L, roomType, slot, currentBookingId);

            assertThat(result).isEqualTo(room);
            // verify đúng excludeId được truyền xuống repository
            verify(bookingRepository).existsRoomConflict(
                    eq(10L), any(), any(), eq(currentBookingId));
        }
    }

    // ====================================================== validateNoConflict
    @Nested
    @DisplayName("validateNoConflict() — chỉ kiểm tra lịch trùng")
    class ValidateNoConflict {

        @Test
        @DisplayName("không ném exception khi phòng trống")
        void noException_whenNoConflict() {
            when(bookingRepository.existsRoomConflict(
                    10L, slot.getStartDate(), slot.getEndDate(), -1L))
                    .thenReturn(false);

            conflictChecker.validateNoConflict(room, slot, -1L);  // không ném là pass
        }

        @Test
        @DisplayName("ném BusinessException khi có booking trùng")
        void throwsException_whenConflict() {
            when(bookingRepository.existsRoomConflict(
                    10L, slot.getStartDate(), slot.getEndDate(), -1L))
                    .thenReturn(true);

            assertThatThrownBy(() ->
                    conflictChecker.validateNoConflict(room, slot, -1L)
            )
            .isInstanceOf(BusinessException.class)
            .extracting("errorCode").isEqualTo(ErrorCode.BOOKING_CONFLICT);
        }
    }

    // ====================================================== isRoomAvailable
    @Nested
    @DisplayName("isRoomAvailable() — kiểm tra phòng trống không ném exception")
    class IsRoomAvailable {

        @Test
        @DisplayName("trả về true khi phòng không bị đặt")
        void returnsTrue_whenAvailable() {
            when(bookingRepository.existsRoomConflict(
                    10L, slot.getStartDate(), slot.getEndDate(), -1L))
                    .thenReturn(false);

            assertThat(conflictChecker.isRoomAvailable(10L, slot)).isTrue();
        }

        @Test
        @DisplayName("trả về false khi phòng đã bị đặt")
        void returnsFalse_whenOccupied() {
            when(bookingRepository.existsRoomConflict(
                    10L, slot.getStartDate(), slot.getEndDate(), -1L))
                    .thenReturn(true);

            assertThat(conflictChecker.isRoomAvailable(10L, slot)).isFalse();
        }
    }

    // ====================================================== filterAvailableRooms
    @Nested
    @DisplayName("filterAvailableRooms() — lọc danh sách phòng available")
    class FilterAvailableRooms {

        @Test
        @DisplayName("chỉ trả về phòng không bị conflict")
        void returnsOnlyAvailableRooms() {
            Room room2 = Room.builder()
                    .id(20L).roomNumber("102").floor("1")
                    .roomType(roomType).status(Room.Status.AVAILABLE).build();
            Room room3 = Room.builder()
                    .id(30L).roomNumber("103").floor("1")
                    .roomType(roomType).status(Room.Status.AVAILABLE).build();

            // room (id=10) → bị đặt
            when(bookingRepository.existsRoomConflict(10L, slot.getStartDate(), slot.getEndDate(), -1L))
                    .thenReturn(true);
            // room2 (id=20) → còn trống
            when(bookingRepository.existsRoomConflict(20L, slot.getStartDate(), slot.getEndDate(), -1L))
                    .thenReturn(false);
            // room3 (id=30) → còn trống
            when(bookingRepository.existsRoomConflict(30L, slot.getStartDate(), slot.getEndDate(), -1L))
                    .thenReturn(false);

            List<Room> available = conflictChecker.filterAvailableRooms(
                    List.of(room, room2, room3), slot);

            assertThat(available)
                    .hasSize(2)
                    .extracting(Room::getId)
                    .containsExactly(20L, 30L);
        }

        @Test
        @DisplayName("trả về danh sách rỗng khi tất cả phòng đều bị đặt")
        void returnsEmpty_whenAllOccupied() {
            when(bookingRepository.existsRoomConflict(
                    eq(10L), any(), any(), eq(-1L)))
                    .thenReturn(true);

            List<Room> available = conflictChecker.filterAvailableRooms(List.of(room), slot);
            assertThat(available).isEmpty();
        }

        @Test
        @DisplayName("trả về danh sách rỗng khi input rỗng")
        void returnsEmpty_whenInputEmpty() {
            List<Room> available = conflictChecker.filterAvailableRooms(List.of(), slot);
            assertThat(available).isEmpty();
            verifyNoInteractions(bookingRepository);
        }
    }

    // ====================================================== getConflictingBookings
    @Nested
    @DisplayName("getConflictingBookings() — lấy các booking đang chiếm phòng")
    class GetConflictingBookings {

        @Test
        @DisplayName("trả về đúng danh sách booking từ repository")
        void returnsDelegatedList() {
            Booking b1 = mock(Booking.class);
            Booking b2 = mock(Booking.class);
            when(bookingRepository.findActiveBookingsByRoomAndDateRange(
                    10L, slot.getStartDate(), slot.getEndDate()))
                    .thenReturn(List.of(b1, b2));

            List<Booking> result = conflictChecker.getConflictingBookings(10L, slot);

            assertThat(result).containsExactly(b1, b2);
        }

        @Test
        @DisplayName("trả về danh sách rỗng khi không có booking nào")
        void returnsEmpty_whenNoBookings() {
            when(bookingRepository.findActiveBookingsByRoomAndDateRange(
                    10L, slot.getStartDate(), slot.getEndDate()))
                    .thenReturn(List.of());

            assertThat(conflictChecker.getConflictingBookings(10L, slot)).isEmpty();
        }
    }

    // ====================================================== helper
    private static LocalDate ld(String date) {
        return LocalDate.parse(date);
    }
}
