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

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private ExtraServiceInventoryItemRepository extraServiceInventoryItemRepository;

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

    @Test
    @DisplayName("Tự động trừ tồn kho đồ dùng khi thêm dịch vụ và hoàn trả khi xóa dịch vụ")
    void testInventoryDeductionAndRestoration() {
        // Tạo mặt hàng trong kho với tồn kho ban đầu 50
        InventoryItem water = inventoryItemRepository.save(InventoryItem.builder()
                .name("Nước khoáng Lavie 500ml")
                .unit("chai")
                .quantityOnHand(50)
                .lowStockThreshold(10)
                .build());

        // Tạo dịch vụ phụ thu có liên kết trừ kho: mỗi suất tiêu hao 2 chai nước
        ExtraService drinkService = extraServiceRepository.save(ExtraService.builder()
                .name("Gói Nước Uống Phòng")
                .unitPrice(new BigDecimal("30000"))
                .unit("suất")
                .active(true)
                .build());

        extraServiceInventoryItemRepository.save(ExtraServiceInventoryItem.builder()
                .extraService(drinkService)
                .inventoryItem(water)
                .quantity(2)
                .build());

        // Ghi nhận dịch vụ 4 suất -> Cần xuất: 4 * 2 = 8 chai
        BookingServiceUsageRequest req = new BookingServiceUsageRequest();
        req.setExtraServiceId(drinkService.getId());
        req.setQuantity(4);

        BookingServiceUsageResponse usage = usageService.add(testBooking.getId(), req, testUser);
        assertNotNull(usage);
        assertNotNull(usage.getDeductedInventoryItems());
        assertEquals(1, usage.getDeductedInventoryItems().size());
        assertEquals(8, usage.getDeductedInventoryItems().get(0).getQuantity());

        // Kiểm tra tồn kho đã bị trừ từ 50 xuống 42 (50 - 8)
        InventoryItem updatedWater = inventoryItemRepository.findById(water.getId()).orElseThrow();
        assertEquals(42, updatedWater.getQuantityOnHand());

        // Xóa dịch vụ khỏi booking -> Tồn kho phải được tự động hoàn lại thành 50 (42 + 8)
        usageService.remove(testBooking.getId(), usage.getId(), testUser);

        InventoryItem restoredWater = inventoryItemRepository.findById(water.getId()).orElseThrow();
        assertEquals(50, restoredWater.getQuantityOnHand());
    }

    @Test
    @DisplayName("Kiểm tra chặn ghi nhận dịch vụ nếu tồn kho không đủ (Insufficient Stock)")
    void testAddServiceUsageInsufficientStockFails() {
        // Tạo mặt hàng chỉ còn tồn kho 3 cái
        InventoryItem towel = inventoryItemRepository.save(InventoryItem.builder()
                .name("Khăn tắm VIP")
                .unit("chiếc")
                .quantityOnHand(3)
                .lowStockThreshold(5)
                .build());

        // Dịch vụ yêu cầu 2 chiếc / suất
        ExtraService spaService = extraServiceRepository.save(ExtraService.builder()
                .name("Dịch vụ Tắm khoáng Spa")
                .unitPrice(new BigDecimal("100000"))
                .unit("lượt")
                .active(true)
                .build());

        extraServiceInventoryItemRepository.save(ExtraServiceInventoryItem.builder()
                .extraService(spaService)
                .inventoryItem(towel)
                .quantity(2)
                .build());

        // Yêu cầu 2 lượt -> Cần: 4 chiếc, nhưng chỉ có 3 chiếc -> Phải quăng IllegalArgumentException
        BookingServiceUsageRequest req = new BookingServiceUsageRequest();
        req.setExtraServiceId(spaService.getId());
        req.setQuantity(2);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            usageService.add(testBooking.getId(), req, testUser);
        });

        assertTrue(ex.getMessage().contains("Không đủ tồn kho"));
        assertTrue(ex.getMessage().contains("Khăn tắm VIP"));

        // Kiểm tra tồn kho vẫn nguyên vẹn 3 chiếc
        InventoryItem intactTowel = inventoryItemRepository.findById(towel.getId()).orElseThrow();
        assertEquals(3, intactTowel.getQuantityOnHand());
    }
}
