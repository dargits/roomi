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
import java.util.Map;

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

    @Test
    @DisplayName("Đổi phòng cùng loại thành công")
    void testChangeRoomSameTypeSuccess() {
        // Tạo thêm phòng thứ 2 cùng testRoomType
        Room anotherSameTypeRoom = roomRepository.save(Room.builder()
                .roomNumber("102-TEST")
                .roomType(testRoomType)
                .floor("1")
                .status(RoomStatus.AVAILABLE)
                .build());

        BookingRequest request = new BookingRequest();
        request.setGuestId(testGuest.getId());
        request.setRoomTypeId(testRoomType.getId());
        request.setCheckInDate(LocalDate.now().plusDays(20));
        request.setCheckOutDate(LocalDate.now().plusDays(22));

        BookingResponse created = bookingService.create(request, testUser);
        BookingResponse confirmed = bookingService.assignRoom(created.getId(), testRoom.getId(), testUser);
        assertEquals(testRoom.getRoomNumber(), confirmed.getRoomNumber());

        // Đổi sang anotherSameTypeRoom
        BookingResponse changed = bookingService.changeRoom(confirmed.getId(), anotherSameTypeRoom.getId(), testUser);
        assertNotNull(changed);
        assertEquals(anotherSameTypeRoom.getRoomNumber(), changed.getRoomNumber());
        assertEquals(testRoomType.getName(), changed.getRoomTypeName());
    }

    @Test
    @DisplayName("Đổi sang phòng khác loại ném ngoại lệ IllegalArgumentException")
    void testChangeRoomDifferentTypeThrowsException() {
        // Tạo loại phòng khác và phòng thuộc loại đó
        RoomType otherRoomType = roomTypeRepository.save(RoomType.builder()
                .name("VIP-SUITE-TEST")
                .basePrice(new BigDecimal("2000000"))
                .maxCapacity(4)
                .amenitiesDescription("Phòng VIP Suite")
                .build());
        Room differentTypeRoom = roomRepository.save(Room.builder()
                .roomNumber("999-VIP")
                .roomType(otherRoomType)
                .floor("9")
                .status(RoomStatus.AVAILABLE)
                .build());

        BookingRequest request = new BookingRequest();
        request.setGuestId(testGuest.getId());
        request.setRoomTypeId(testRoomType.getId());
        request.setCheckInDate(LocalDate.now().plusDays(25));
        request.setCheckOutDate(LocalDate.now().plusDays(27));

        BookingResponse created = bookingService.create(request, testUser);
        BookingResponse confirmed = bookingService.assignRoom(created.getId(), testRoom.getId(), testUser);

        // Đổi sang phòng khác loại phòng -> Ném lỗi
        assertThrows(IllegalArgumentException.class, () -> {
            bookingService.changeRoom(confirmed.getId(), differentTypeRoom.getId(), testUser);
        });
    }

    @Test
    @DisplayName("Kiểm tra khả dụng gia hạn và thực hiện gia hạn thành công")
    void testCheckExtendAvailabilityAndExtendStay() {
        BookingRequest request = new BookingRequest();
        request.setGuestId(testGuest.getId());
        request.setRoomTypeId(testRoomType.getId());
        request.setCheckInDate(LocalDate.now());
        request.setCheckOutDate(LocalDate.now().plusDays(2));

        BookingResponse created = bookingService.create(request, testUser);
        BookingResponse confirmed = bookingService.assignRoom(created.getId(), testRoom.getId(), testUser);
        BookingResponse checkedIn = bookingService.checkIn(confirmed.getId(), testUser);

        // 1. Kiểm tra khả dụng gia hạn 1 đêm
        Map<String, Object> avail = bookingService.checkExtendAvailability(checkedIn.getId(), 1);
        assertNotNull(avail);
        assertEquals(Boolean.TRUE, avail.get("available"));
        assertEquals(LocalDate.now().plusDays(3).toString(), avail.get("newCheckOutDate"));

        // 2. Thực hiện gia hạn 1 đêm
        plant.stay.dto.request.ExtendStayRequest extendReq = new plant.stay.dto.request.ExtendStayRequest();
        extendReq.setAdditionalNights(1);
        extendReq.setNote("Khách ở thêm 1 ngày");
        BookingResponse extended = bookingService.extendStay(checkedIn.getId(), extendReq, testUser);

        assertNotNull(extended);
        assertEquals(LocalDate.now().plusDays(3), extended.getCheckOutDate());
    }

    @Test
    @DisplayName("Nâng hạng phòng theo loại phòng mới thành công")
    void testUpgradeRoomByTypeSuccess() {
        // Tạo loại phòng Deluxe có 1 phòng trống
        RoomType deluxeType = roomTypeRepository.save(RoomType.builder()
                .name("DELUXE-TEST")
                .basePrice(new BigDecimal("1500000"))
                .maxCapacity(3)
                .amenitiesDescription("Phòng Deluxe rộng rãi")
                .build());
        Room deluxeRoom = roomRepository.save(Room.builder()
                .roomNumber("301-DELUXE")
                .roomType(deluxeType)
                .floor("3")
                .status(RoomStatus.AVAILABLE)
                .build());

        BookingRequest request = new BookingRequest();
        request.setGuestId(testGuest.getId());
        request.setRoomTypeId(testRoomType.getId());
        request.setCheckInDate(LocalDate.now());
        request.setCheckOutDate(LocalDate.now().plusDays(2));

        BookingResponse created = bookingService.create(request, testUser);
        BookingResponse confirmed = bookingService.assignRoom(created.getId(), testRoom.getId(), testUser);
        BookingResponse checkedIn = bookingService.checkIn(confirmed.getId(), testUser);

        // Nâng hạng sang deluxeType (chỉ truyền newRoomTypeId)
        plant.stay.dto.request.UpgradeRoomRequest upgradeReq = new plant.stay.dto.request.UpgradeRoomRequest();
        upgradeReq.setNewRoomTypeId(deluxeType.getId());
        upgradeReq.setReason("Nâng hạng phòng view đẹp");

        BookingResponse upgraded = bookingService.upgradeRoom(checkedIn.getId(), upgradeReq, testUser);
        assertNotNull(upgraded);
        assertEquals(deluxeType.getName(), upgraded.getRoomTypeName());
        assertEquals(deluxeRoom.getRoomNumber(), upgraded.getRoomNumber());

        // Kiểm tra phòng cũ sang DIRTY, phòng mới sang OCCUPIED
        Room oldRoom = roomRepository.findById(testRoom.getId()).orElseThrow();
        Room newRoom = roomRepository.findById(deluxeRoom.getId()).orElseThrow();
        assertEquals(RoomStatus.DIRTY, oldRoom.getStatus());
        assertEquals(RoomStatus.OCCUPIED, newRoom.getStatus());
    }
}
