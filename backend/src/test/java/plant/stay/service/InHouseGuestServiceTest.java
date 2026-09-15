package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.InHouseGuestResponse;
import plant.stay.model.*;
import plant.stay.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class InHouseGuestServiceTest {

    @Autowired
    private InHouseGuestService inHouseGuestService;

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
    private RoomStayGuestRepository roomStayGuestRepository;

    private User testStaff;
    private Guest testGuest;
    private RoomType testRoomType;
    private Room testRoom;

    @BeforeEach
    void setUp() {
        testStaff = userRepository.save(User.builder()
                .account("test_receptionist_" + System.currentTimeMillis())
                .password("password123")
                .name("Nhân viên Lễ tân")
                .role(Role.RECEPTIONIST)
                .active(true)
                .build());

        testGuest = guestRepository.save(Guest.builder()
                .name("Nguyễn Văn An")
                .phone("0987654321")
                .idNumber("001201009999")
                .build());

        testRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe Double")
                .basePrice(new BigDecimal("800000"))
                .standardCapacity(2)
                .maxCapacity(3)
                .build());

        testRoom = roomRepository.save(Room.builder()
                .roomNumber("P205")
                .floor("2")
                .roomType(testRoomType)
                .status(RoomStatus.OCCUPIED)
                .build());
    }

    @Test
    @DisplayName("Chỉ trả về các đặt phòng đang có trạng thái CHECKED_IN và tính toán chính xác thông tin lưu trú")
    void testGetInHouseGuests_Success() {
        LocalDate today = LocalDate.now();

        // Booking 1: CHECKED_IN (nên có trong danh sách)
        Booking inHouseBooking = bookingRepository.save(Booking.builder()
                .guest(testGuest)
                .roomType(testRoomType)
                .room(testRoom)
                .checkInDate(today.minusDays(1))
                .checkOutDate(today) // Trả phòng hôm nay!
                .checkedInAt(LocalDateTime.now().minusDays(1))
                .status(BookingStatus.CHECKED_IN)
                .actualPrice(new BigDecimal("800000"))
                .expectedPrice(new BigDecimal("800000"))
                .note("Yêu cầu thêm chăn gối")
                .createdBy(testStaff)
                .build());

        // Booking 2: CONFIRMED (chưa nhận phòng, KHÔNG được có trong danh sách)
        bookingRepository.save(Booking.builder()
                .guest(testGuest)
                .roomType(testRoomType)
                .checkInDate(today)
                .checkOutDate(today.plusDays(2))
                .status(BookingStatus.CONFIRMED)
                .expectedPrice(new BigDecimal("1600000"))
                .createdBy(testStaff)
                .build());

        // Thêm khách cùng phòng
        roomStayGuestRepository.save(RoomStayGuest.builder()
                .booking(inHouseBooking)
                .fullName("Trần Thị Bình")
                .documentType("CCCD")
                .documentNumber("001201008888")
                .isPrimaryGuest(false)
                .build());

        List<InHouseGuestResponse> list = inHouseGuestService.getInHouseGuests(testStaff);

        assertNotNull(list);
        assertFalse(list.isEmpty());

        InHouseGuestResponse found = list.stream()
                .filter(item -> item.getBookingId().equals(inHouseBooking.getId()))
                .findFirst()
                .orElse(null);

        assertNotNull(found, "Phải tìm thấy booking CHECKED_IN trong danh sách");
        assertEquals("P205", found.getRoomNumber());
        assertEquals("2", found.getFloor());
        assertEquals("Deluxe Double", found.getRoomTypeName());
        assertEquals("Nguyễn Văn An", found.getPrimaryGuestName());
        assertEquals("0987654321", found.getGuestPhone());
        assertTrue(found.isCheckingOutToday(), "Phải đánh dấu trả phòng hôm nay");
        assertEquals(new BigDecimal("800000"), found.getIncurredAmount());
        assertTrue(found.isHasDebt(), "Chưa thanh toán nên phải có nợ");
        assertEquals("Yêu cầu thêm chăn gối", found.getSpecialRequests());

        // Test Filter by floor: Tầng "2" tìm thấy, Tầng "99" không tìm thấy
        List<InHouseGuestResponse> floor2List = inHouseGuestService.getInHouseGuests(testStaff, "2", null, null, null, null);
        assertFalse(floor2List.isEmpty());
        List<InHouseGuestResponse> floor99List = inHouseGuestService.getInHouseGuests(testStaff, "99", null, null, null, null);
        assertTrue(floor99List.isEmpty());

        // Test Filter Options
        var filterOptions = inHouseGuestService.getFilterOptions();
        assertNotNull(filterOptions);
        assertNotNull(filterOptions.getFloors());
        assertTrue(filterOptions.getFloors().contains("2"));

        // Test Summary
        var summary = inHouseGuestService.getSummary(testStaff);
        assertNotNull(summary);
        assertTrue(summary.getTotalRooms() >= 1);
        assertTrue(summary.getCheckoutTodayCount() >= 1);
        assertTrue(summary.getDebtCount() >= 1);
    }
}
