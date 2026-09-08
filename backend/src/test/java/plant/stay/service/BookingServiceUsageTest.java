package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.BookingServiceUsageRequest;
import plant.stay.dto.response.BookingServiceUsageResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.model.*;
import plant.stay.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class BookingServiceUsageTest {

    @Autowired
    private BookingServiceUsageService usageService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private GuestRepository guestRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExtraServiceRepository extraServiceRepository;

    private User testUser;
    private Booking testBooking;
    private ExtraService testExtraService;

    @BeforeEach
    void setUp() {
        testUser = userRepository.findByAccount("letan")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Lê Ngọc Hân")
                        .account("letan_usage")
                        .password("pass123")
                        .role(Role.RECEPTIONIST)
                        .phone("0987654321")
                        .build()));

        Guest guest = guestRepository.save(Guest.builder()
                .name("Nguyễn Văn Dịch Vụ")
                .phone("0912345678")
                .idNumber("123123123123")
                .build());

        RoomType roomType = roomTypeRepository.findAll().stream().findFirst().orElseThrow();
        Room room = roomRepository.findAll().stream().findFirst().orElseThrow();

        testBooking = bookingRepository.save(Booking.builder()
                .guest(guest)
                .roomType(roomType)
                .room(room)
                .checkInDate(LocalDate.now())
                .checkOutDate(LocalDate.now().plusDays(1))
                .status(BookingStatus.CHECKED_IN)
                .expectedPrice(new BigDecimal("500000"))
                .createdBy(testUser)
                .build());

        testExtraService = extraServiceRepository.save(ExtraService.builder()
                .name("Giặt ủi quần áo nhanh")
                .unitPrice(new BigDecimal("60000"))
                .unit("Bộ")
                .active(true)
                .build());
    }

    @Test
    @DisplayName("Thêm dịch vụ phụ thu vào đặt phòng đang ở")
    void testAddServiceUsageSuccess() {
        BookingServiceUsageRequest request = new BookingServiceUsageRequest();
        request.setExtraServiceId(testExtraService.getId());
        request.setQuantity(2);

        BookingServiceUsageResponse response = usageService.add(testBooking.getId(), request, testUser);

        assertNotNull(response);
        assertNotNull(response.getId());
        assertEquals("Giặt ủi quần áo nhanh", response.getServiceName());
        assertEquals(2, response.getQuantity());
        assertEquals(0, new BigDecimal("60000").compareTo(response.getUnitPriceSnapshot()));
        assertEquals(0, new BigDecimal("120000").compareTo(response.getTotal()));
    }

    @Test
    @DisplayName("Lấy danh sách dịch vụ phụ thu đã dùng của booking")
    void testGetUsagesByBooking() {
        BookingServiceUsageRequest request = new BookingServiceUsageRequest();
        request.setExtraServiceId(testExtraService.getId());
        request.setQuantity(1);
        usageService.add(testBooking.getId(), request, testUser);

        List<BookingServiceUsageResponse> usages = usageService.getByBooking(testBooking.getId());
        assertNotNull(usages);
        assertEquals(1, usages.size());
        assertEquals("Giặt ủi quần áo nhanh", usages.get(0).getServiceName());
    }

    @Test
    @DisplayName("Xóa dịch vụ phụ thu khỏi đặt phòng")
    void testRemoveServiceUsage() {
        BookingServiceUsageRequest request = new BookingServiceUsageRequest();
        request.setExtraServiceId(testExtraService.getId());
        request.setQuantity(3);
        BookingServiceUsageResponse added = usageService.add(testBooking.getId(), request, testUser);

        MessageResponse removeRes = usageService.remove(testBooking.getId(), added.getId(), testUser);
        assertNotNull(removeRes);

        List<BookingServiceUsageResponse> usages = usageService.getByBooking(testBooking.getId());
        assertTrue(usages.isEmpty());
    }
}
