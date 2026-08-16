package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.BookingRequest;
import plant.stay.dto.response.BookingResponse;
import plant.stay.model.*;
import plant.stay.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class BookingServiceTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private GuestRepository guestRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    private Guest testGuest;
    private RoomType testRoomType;
    private Room testRoom;
    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = userRepository.findByAccount("letan")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Lê Ngọc Hân")
                        .account("letan_test")
                        .password("pass123")
                        .role(Role.RECEPTIONIST)
                        .phone("0987654321")
                        .build()));

        testGuest = guestRepository.save(Guest.builder()
                .name("Nguyễn Văn A")
                .phone("0909123456")
                .idNumber("123456789012")
                .build());

        testRoomType = roomTypeRepository.findAll().stream()
                .findFirst()
                .orElseGet(() -> roomTypeRepository.save(RoomType.builder()
                        .name("Standard Test")
                        .basePrice(new BigDecimal("500000"))
                        .maxCapacity(2)
                        .build()));

        testRoom = roomRepository.findByRoomNumber("102")
                .orElseGet(() -> roomRepository.save(Room.builder()
                        .roomNumber("102")
                        .roomType(testRoomType)
                        .floor("1")
                        .status(RoomStatus.AVAILABLE)
                        .build()));
    }

    @Test
    @DisplayName("Tạo đặt phòng thành công với ngày hợp lệ và tính giá chính xác")
    void testCreateBookingSuccess() {
        BookingRequest request = new BookingRequest();
        request.setGuestId(testGuest.getId());
        request.setRoomTypeId(testRoomType.getId());
        request.setCheckInDate(LocalDate.now().plusDays(1));
        request.setCheckOutDate(LocalDate.now().plusDays(3));
        request.setNote("Khách cần phòng thoáng");

        BookingResponse response = bookingService.create(request, testUser);

        assertNotNull(response);
        assertNotNull(response.getId());
        assertEquals(BookingStatus.NEW, response.getStatus());
        assertEquals(testGuest.getName(), response.getGuestName());
        assertNotNull(response.getExpectedPrice());
        assertTrue(response.getExpectedPrice().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    @DisplayName("Ném ngoại lệ khi ngày trả phòng trước hoặc bằng ngày nhận phòng")
    void testCreateBookingInvalidDates() {
        BookingRequest request = new BookingRequest();
        request.setGuestId(testGuest.getId());
        request.setRoomTypeId(testRoomType.getId());
        request.setCheckInDate(LocalDate.now().plusDays(3));
        request.setCheckOutDate(LocalDate.now().plusDays(1)); // Invalid: checkout before checkin

        assertThrows(IllegalArgumentException.class, () -> {
            bookingService.create(request, testUser);
        });
    }

    @Test
    @DisplayName("Gán phòng cho đặt phòng mới chuyển trạng thái sang CONFIRMED")
    void testAssignRoomSuccess() {
        BookingRequest request = new BookingRequest();
        request.setGuestId(testGuest.getId());
        request.setRoomTypeId(testRoomType.getId());
        request.setCheckInDate(LocalDate.now().plusDays(5));
        request.setCheckOutDate(LocalDate.now().plusDays(7));

        BookingResponse created = bookingService.create(request, testUser);

        BookingResponse assigned = bookingService.assignRoom(created.getId(), testRoom.getId(), testUser);

        assertNotNull(assigned);
        assertEquals(BookingStatus.CONFIRMED, assigned.getStatus());
        assertEquals(testRoom.getRoomNumber(), assigned.getRoomNumber());
    }

    @Test
    @DisplayName("Hủy đặt phòng chuyển trạng thái sang CANCELLED")
    void testCancelBooking() {
        BookingRequest request = new BookingRequest();
        request.setGuestId(testGuest.getId());
        request.setRoomTypeId(testRoomType.getId());
        request.setCheckInDate(LocalDate.now().plusDays(10));
        request.setCheckOutDate(LocalDate.now().plusDays(12));

        BookingResponse created = bookingService.create(request, testUser);
        BookingResponse cancelled = bookingService.cancel(created.getId(), testUser);

        assertEquals(BookingStatus.CANCELLED, cancelled.getStatus());
    }

    @Test
    @DisplayName("Quy trình Nhận phòng (CHECK_IN) và Trả phòng (CHECK_OUT) sau khi thanh toán hóa đơn")
    void testCheckInAndCheckOutFlow() {
        BookingRequest request = new BookingRequest();
        request.setGuestId(testGuest.getId());
        request.setRoomTypeId(testRoomType.getId());
        request.setCheckInDate(LocalDate.now());
        request.setCheckOutDate(LocalDate.now().plusDays(2));

        BookingResponse created = bookingService.create(request, testUser);
        // Gán phòng để chuyển từ NEW sang CONFIRMED
        BookingResponse confirmed = bookingService.assignRoom(created.getId(), testRoom.getId(), testUser);
        assertEquals(BookingStatus.CONFIRMED, confirmed.getStatus());

        // Check-in
        BookingResponse checkedIn = bookingService.checkIn(confirmed.getId(), testUser);
        assertEquals(BookingStatus.CHECKED_IN, checkedIn.getStatus());

        // Thử check-out khi chưa thanh toán hóa đơn -> Ném ngoại lệ
        assertThrows(IllegalArgumentException.class, () -> {
            bookingService.checkOut(checkedIn.getId(), testUser);
        });

        // Tạo hóa đơn đã thanh toán hoàn tất
        Booking bookingEntity = bookingRepository.findById(checkedIn.getId()).orElseThrow();
        invoiceRepository.save(Invoice.builder()
                .booking(bookingEntity)
                .roomAmount(new BigDecimal("1000000"))
                .serviceAmount(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("1000000"))
                .status(InvoiceStatus.PAID)
                .createdBy(testUser)
                .build());

        // Check-out thành công
        BookingResponse checkedOut = bookingService.checkOut(checkedIn.getId(), testUser);
        assertEquals(BookingStatus.CHECKED_OUT, checkedOut.getStatus());

        // Phòng chuyển sang DIRTY sau khi trả
        Room updatedRoom = roomRepository.findById(testRoom.getId()).orElseThrow();
        assertEquals(RoomStatus.DIRTY, updatedRoom.getStatus());
    }
}
