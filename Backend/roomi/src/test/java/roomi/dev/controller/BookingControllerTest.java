package roomi.dev.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import roomi.dev.dto.response.BookingResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Booking;
import roomi.dev.model.Guest;
import roomi.dev.model.Room;
import roomi.dev.model.RoomType;
import roomi.dev.model.User;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.RoomRepository;
import roomi.dev.repository.RoomTypeRepository;
import roomi.dev.repository.SeasonalRateRepository;
import roomi.dev.repository.UserRepository;
import roomi.dev.service.impl.BookingServiceImpl;
import roomi.dev.service.impl.GuestServiceImpl;
import roomi.dev.dto.request.BookingRequest;
import roomi.dev.util.time.BookingConflictChecker;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BookingServiceImpl — Kiểm thử gán phòng")
class BookingControllerTest {

    @Mock BookingRepository      bookingRepository;
    @Mock RoomRepository         roomRepository;
    @Mock RoomTypeRepository     roomTypeRepository;
    @Mock SeasonalRateRepository seasonalRateRepository;
    @Mock GuestServiceImpl       guestService;
    @Mock UserRepository         userRepository;

    BookingServiceImpl bookingService;

    @BeforeEach
    void setUp() {
        BookingConflictChecker conflictChecker = new BookingConflictChecker(bookingRepository, roomRepository);
        bookingService = new BookingServiceImpl(
            bookingRepository,
            roomRepository,
            roomTypeRepository,
            seasonalRateRepository,
            guestService,
            conflictChecker,
            userRepository
        );
    }

    // ------------------------------------------------------------------ fixtures

    private RoomType roomType(Long id, String name, BigDecimal base) {
        return RoomType.builder().id(id).name(name).capacity(2)
                .amenities("WiFi").basePrice(base).build();
    }

    private Room room(Long id, String number, RoomType rt) {
        return Room.builder().id(id).roomNumber(number).roomType(rt)
                .status(Room.Status.AVAILABLE).build();
    }

    private Guest guest() {
        return Guest.builder().id(1L).fullName("Nguyễn Văn A").phone("0901234567").build();
    }

    private User staff() {
        return User.builder().id(1L).fullName("Admin").username("admin")
                .passwordHash("x").role(User.Role.RECEPTIONIST).active(true).build();
    }

    /** Tạo booking đã lưu với trạng thái cho trước */
    private Booking booking(Long id, Room room, RoomType rt, Booking.Status status,
                             LocalDate in, LocalDate out) {
        return Booking.builder()
                .id(id).guest(guest()).roomType(rt).room(room)
                .checkInDate(in).checkOutDate(out)
                .status(status).source(Booking.Source.WALK_IN)
                .expectedPrice(BigDecimal.ZERO).createdBy(staff()).build();
    }

    // ================================================================== GÁN TRÙNG THỜI GIAN

    @Nested
    @DisplayName("Kiểm thử chồng lấn khoảng thời gian khi gán phòng")
    class RoomConflict {

        @Test
        @DisplayName("Lỗi BOOKING_CONFLICT — phòng đã có booking trùng hoàn toàn [08-01 → 08-04]")
        void assignRoom_fullOverlap_throwsConflict() {
            RoomType rt = roomType(1L, "Deluxe", new BigDecimal("800000"));
            Room r      = room(5L, "101", rt);

            Booking existing = booking(1L, r, rt, Booking.Status.NEW,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4));

            // Booking mới muốn gán phòng 101 cùng khoảng 08-01 → 08-04
            Booking newBooking = booking(2L, null, rt, Booking.Status.NEW,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4));

            when(bookingRepository.findById(2L)).thenReturn(Optional.of(newBooking));
            when(roomRepository.findById(5L)).thenReturn(Optional.of(r));
            // existsRoomConflict trả true → phòng đã bị chiếm
            when(bookingRepository.existsRoomConflict(5L,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4), 2L))
                    .thenReturn(true);
            when(seasonalRateRepository.findByRoomTypeId(1L)).thenReturn(List.of());

            assertThatThrownBy(() -> bookingService.assignRoom(2L, 5L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("đã được đặt")
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.BOOKING_CONFLICT);
        }

        @Test
        @DisplayName("Lỗi BOOKING_CONFLICT — chồng lấn một phần (08-03 → 08-06 vs 08-01 → 08-04)")
        void assignRoom_partialOverlap_throwsConflict() {
            RoomType rt = roomType(1L, "Deluxe", new BigDecimal("800000"));
            Room r      = room(5L, "101", rt);

            Booking newBooking = booking(3L, null, rt, Booking.Status.NEW,
                    LocalDate.of(2027, 8, 3), LocalDate.of(2027, 8, 6));

            when(bookingRepository.findById(3L)).thenReturn(Optional.of(newBooking));
            when(roomRepository.findById(5L)).thenReturn(Optional.of(r));
            when(bookingRepository.existsRoomConflict(5L,
                    LocalDate.of(2027, 8, 3), LocalDate.of(2027, 8, 6), 3L))
                    .thenReturn(true);
            when(seasonalRateRepository.findByRoomTypeId(1L)).thenReturn(List.of());

            assertThatThrownBy(() -> bookingService.assignRoom(3L, 5L))
                    .isInstanceOf(BusinessException.class)
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.BOOKING_CONFLICT);
        }

        @Test
        @DisplayName("Thành công — kề sát nhau không overlap: checkOut A == checkIn B (half-open interval)")
        void assignRoom_adjacentDates_noConflict() {
            RoomType rt = roomType(1L, "Deluxe", new BigDecimal("800000"));
            Room r      = room(5L, "101", rt);

            // Booking B: 08-04 → 08-07 (check-in đúng ngày check-out của A → hợp lệ)
            Booking newBooking = booking(4L, null, rt, Booking.Status.NEW,
                    LocalDate.of(2027, 8, 4), LocalDate.of(2027, 8, 7));

            when(bookingRepository.findById(4L)).thenReturn(Optional.of(newBooking));
            when(roomRepository.findById(5L)).thenReturn(Optional.of(r));
            when(bookingRepository.existsRoomConflict(5L,
                    LocalDate.of(2027, 8, 4), LocalDate.of(2027, 8, 7), 4L))
                    .thenReturn(false);  // không conflict
            when(seasonalRateRepository.findByRoomTypeId(1L)).thenReturn(List.of());
            when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BookingResponse result = bookingService.assignRoom(4L, 5L);

            assertThat(result.getRoomId()).isEqualTo(5L);
            assertThat(result.getRoomNumber()).isEqualTo("101");
        }

        @Test
        @DisplayName("Thành công — gán phòng lần đầu, expectedPrice tính đúng theo basePrice (3 đêm x 800k)")
        void assignRoom_success_calcsPriceByBasePrice() {
            RoomType rt = roomType(1L, "Deluxe", new BigDecimal("800000"));
            Room r      = room(5L, "101", rt);

            Booking b = booking(5L, null, rt, Booking.Status.NEW,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4));  // 3 đêm

            when(bookingRepository.findById(5L)).thenReturn(Optional.of(b));
            when(roomRepository.findById(5L)).thenReturn(Optional.of(r));
            when(bookingRepository.existsRoomConflict(5L,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4), 5L))
                    .thenReturn(false);
            when(seasonalRateRepository.findByRoomTypeId(1L)).thenReturn(List.of());
            when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BookingResponse result = bookingService.assignRoom(5L, 5L);

            // 3 đêm x 800_000 = 2_400_000
            assertThat(result.getExpectedPrice())
                    .isEqualByComparingTo(new BigDecimal("2400000"));
        }
    }

    // ================================================================== GÁN VÀO BOOKING ĐÃ HỦY

    @Nested
    @DisplayName("Kiểm thử gán phòng vào booking đã hủy / sai trạng thái")
    class InvalidStatusAssign {

        @Test
        @DisplayName("Lỗi BOOKING_INVALID_STATUS — gán phòng vào booking CANCELLED")
        void assignRoom_cancelledBooking_throwsInvalidStatus() {
            RoomType rt      = roomType(1L, "Deluxe", new BigDecimal("800000"));
            Booking cancelled = booking(10L, null, rt, Booking.Status.CANCELLED,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4));

            when(bookingRepository.findById(10L)).thenReturn(Optional.of(cancelled));

            assertThatThrownBy(() -> bookingService.assignRoom(10L, 5L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("CANCELLED")
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.BOOKING_INVALID_STATUS);

            // Không gọi roomRepository vì bị chặn sớm
            verify(roomRepository, never()).findById(any());
        }

        @Test
        @DisplayName("Lỗi BOOKING_INVALID_STATUS — gán phòng vào booking CHECKED_OUT")
        void assignRoom_checkedOutBooking_throwsInvalidStatus() {
            RoomType rt = roomType(1L, "Deluxe", new BigDecimal("800000"));
            Room r      = room(5L, "101", rt);
            Booking co  = booking(11L, r, rt, Booking.Status.CHECKED_OUT,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4));

            when(bookingRepository.findById(11L)).thenReturn(Optional.of(co));

            assertThatThrownBy(() -> bookingService.assignRoom(11L, 5L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("CHECKED_OUT")
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.BOOKING_INVALID_STATUS);

            verify(roomRepository, never()).findById(any());
        }

        @Test
        @DisplayName("Lỗi BOOKING_INVALID_STATUS — gán phòng vào booking đang CHECKED_IN")
        void assignRoom_checkedInBooking_throwsInvalidStatus() {
            RoomType rt = roomType(1L, "Deluxe", new BigDecimal("800000"));
            Room r      = room(5L, "101", rt);
            Booking ci  = booking(12L, r, rt, Booking.Status.CHECKED_IN,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4));

            when(bookingRepository.findById(12L)).thenReturn(Optional.of(ci));

            assertThatThrownBy(() -> bookingService.assignRoom(12L, 5L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("CHECKED_IN")
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.BOOKING_INVALID_STATUS);

            verify(roomRepository, never()).findById(any());
        }

        @Test
        @DisplayName("200 OK — gán phòng cho booking CONFIRMED vẫn được phép")
        void assignRoom_confirmedBooking_success() {
            RoomType rt = roomType(1L, "Deluxe", new BigDecimal("800000"));
            Room r      = room(5L, "101", rt);
            Booking confirmed = booking(13L, null, rt, Booking.Status.CONFIRMED,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4));

            when(bookingRepository.findById(13L)).thenReturn(Optional.of(confirmed));
            when(roomRepository.findById(5L)).thenReturn(Optional.of(r));
            when(bookingRepository.existsRoomConflict(5L,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4), 13L))
                    .thenReturn(false);
            when(seasonalRateRepository.findByRoomTypeId(1L)).thenReturn(List.of());
            when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BookingResponse result = bookingService.assignRoom(13L, 5L);

            assertThat(result.getRoomId()).isEqualTo(5L);
            assertThat(result.getStatus()).isEqualTo("CONFIRMED");
        }
    }

    // ================================================================== ROOM TYPE MISMATCH

    @Nested
    @DisplayName("Kiểm thử roomType không khớp khi gán phòng")
    class RoomTypeMismatch {

        @Test
        @DisplayName("Lỗi ROOM_TYPE_MISMATCH — phòng thuộc loại khác với booking")
        void assignRoom_wrongRoomType_throwsMismatch() {
            RoomType bookingType = roomType(1L, "Deluxe", new BigDecimal("800000"));
            RoomType wrongType   = roomType(2L, "Suite", new BigDecimal("2000000"));
            Room wrongRoom       = room(99L, "201", wrongType);

            Booking b = booking(20L, null, bookingType, Booking.Status.NEW,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4));

            when(bookingRepository.findById(20L)).thenReturn(Optional.of(b));
            when(roomRepository.findById(99L)).thenReturn(Optional.of(wrongRoom));

            assertThatThrownBy(() -> bookingService.assignRoom(20L, 99L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Deluxe")
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.ROOM_TYPE_MISMATCH);
        }
    }

    // ================================================================== CANCEL → GÁN LẠI

    @Nested
    @DisplayName("Kiểm thử luồng: hủy booking → booking cũ không còn chiếm phòng")
    class CancelThenRebook {

        @Test
        @DisplayName("Sau khi hủy, phòng được gán lại cho booking mới không bị conflict")
        void afterCancel_roomIsAvailableForNewBooking() {
            RoomType rt   = roomType(1L, "Deluxe", new BigDecimal("800000"));
            Room r        = room(5L, "101", rt);

            // Booking A đã bị CANCELLED
            Booking newBooking = booking(30L, null, rt, Booking.Status.NEW,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4));

            when(bookingRepository.findById(30L)).thenReturn(Optional.of(newBooking));
            when(roomRepository.findById(5L)).thenReturn(Optional.of(r));
            // CANCELLED bị loại trừ trong query → existsRoomConflict trả false
            when(bookingRepository.existsRoomConflict(5L,
                    LocalDate.of(2027, 8, 1), LocalDate.of(2027, 8, 4), 30L))
                    .thenReturn(false);
            when(seasonalRateRepository.findByRoomTypeId(1L)).thenReturn(List.of());
            when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BookingResponse result = bookingService.assignRoom(30L, 5L);

            assertThat(result.getRoomId()).isEqualTo(5L);
            assertThat(result.getExpectedPrice())
                    .isEqualByComparingTo(new BigDecimal("2400000"));
        }
    }
}
