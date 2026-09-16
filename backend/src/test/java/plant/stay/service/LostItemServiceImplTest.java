package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.CreateLostItemRequest;
import plant.stay.dto.request.DisposeLostItemRequest;
import plant.stay.dto.request.ReturnLostItemRequest;
import plant.stay.dto.response.LostItemLogResponse;
import plant.stay.dto.response.LostItemResponse;
import plant.stay.dto.response.LostItemSummaryResponse;
import plant.stay.exception.BusinessException;
import plant.stay.model.*;
import plant.stay.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class LostItemServiceImplTest {

    @Autowired
    private LostItemService lostItemService;

    @Autowired
    private LostItemRepository lostItemRepository;

    @Autowired
    private LostItemLogRepository lostItemLogRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private GuestRepository guestRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    private User housekeeper;
    private User receptionist;
    private Room testRoom;
    private Guest testGuest;
    private Booking testBooking;

    @BeforeEach
    void setUp() {
        housekeeper = userRepository.findByAccount("hk_test")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Chị Lan Buồng Phòng")
                        .account("hk_test")
                        .password("pass123")
                        .role(Role.HOUSEKEEPER)
                        .phone("0901112233")
                        .build()));

        receptionist = userRepository.findByAccount("reception_test")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Lễ Tân Mai")
                        .account("reception_test")
                        .password("pass123")
                        .role(Role.RECEPTIONIST)
                        .phone("0902223344")
                        .build()));

        RoomType roomType = roomTypeRepository.findAll().stream().findFirst()
                .orElseGet(() -> roomTypeRepository.save(RoomType.builder()
                        .name("Phòng Deluxe Test")
                        .basePrice(BigDecimal.valueOf(500000))
                        .standardCapacity(2)
                        .maxCapacity(3)
                        .build()));

        testRoom = roomRepository.save(Room.builder()
                .roomNumber("LOST-999")
                .roomType(roomType)
                .floor("9")
                .status(RoomStatus.DIRTY)
                .assignedHousekeeper(housekeeper)
                .build());

        testGuest = guestRepository.save(Guest.builder()
                .name("Nguyễn Văn Khách")
                .phone("0987654321")
                .email("khachhang@gmail.com")
                .build());

        testBooking = bookingRepository.save(Booking.builder()
                .room(testRoom)
                .roomType(roomType)
                .guest(testGuest)
                .checkInDate(LocalDate.now().minusDays(2))
                .checkOutDate(LocalDate.now())
                .checkedInAt(LocalDateTime.now().minusDays(2))
                .checkedOutAt(LocalDateTime.now().minusHours(1))
                .status(BookingStatus.CHECKED_OUT)
                .expectedPrice(BigDecimal.valueOf(1000000))
                .build());
    }

    @Test
    @DisplayName("Ghi nhận đồ để quên -> Tự động gắn với Booking và Guest vừa checkout")
    void testCreateLostItem_autoBindsBookingAndGuest() {
        CreateLostItemRequest req = CreateLostItemRequest.builder()
                .roomId(testRoom.getId())
                .itemName("Tai nghe AirPods Pro màu trắng")
                .foundLocation("Dưới gầm giường gần cửa sổ")
                .foundDate(LocalDate.now())
                .foundTime(LocalTime.of(10, 30))
                .storageLocation("Tủ Lost & Found tầng 1")
                .notes("Hộp sạc có khắc chữ K")
                .build();

        LostItemResponse created = lostItemService.create(req, housekeeper);

        assertNotNull(created);
        assertNotNull(created.getId());
        assertEquals("Tai nghe AirPods Pro màu trắng", created.getItemName());
        assertEquals("Dưới gầm giường gần cửa sổ", created.getFoundLocation());
        assertEquals(LostItemStatus.HOLDING, created.getStatus());
        assertEquals("LOST-999", created.getRoomNumber());

        // Kiểm tra tự động liên kết Booking & Guest
        assertEquals(testBooking.getId(), created.getBookingId());
        assertEquals("Nguyễn Văn Khách", created.getGuestName());
        assertEquals("0987654321", created.getGuestPhone());
        assertEquals("khachhang@gmail.com", created.getGuestEmail());

        // Kiểm tra tính toán hạn lưu giữ
        assertNotNull(created.getRetentionExpiryDate());
        assertTrue(created.getRetentionExpiryDate().isAfter(LocalDate.now().plusDays(20)));

        // Kiểm tra audit log khởi tạo
        List<LostItemLogResponse> logs = lostItemService.getLogsByLostItemId(created.getId());
        assertEquals(1, logs.size());
        assertEquals("CREATED", logs.get(0).getAction());
        assertEquals(LostItemStatus.HOLDING, logs.get(0).getNewStatus());
    }

    @Test
    @DisplayName("Lễ tân liên hệ khách -> Chuyển trạng thái CONTACTED và ghi log")
    void testMarkContacted_success() {
        CreateLostItemRequest req = CreateLostItemRequest.builder()
                .roomId(testRoom.getId())
                .itemName("Đồng hồ Apple Watch Series 8")
                .foundLocation("Bàn trang điểm")
                .foundDate(LocalDate.now())
                .build();

        LostItemResponse created = lostItemService.create(req, housekeeper);

        LostItemResponse contacted = lostItemService.markContacted(
                created.getId(),
                "Đã gọi điện cho anh Khách, khách xác nhận để quên và hẹn 18h ghé nhận",
                receptionist
        );

        assertEquals(LostItemStatus.CONTACTED, contacted.getStatus());

        List<LostItemLogResponse> logs = lostItemService.getLogsByLostItemId(created.getId());
        assertEquals(2, logs.size());
        assertEquals("CONTACTED_GUEST", logs.get(1).getAction());
        assertEquals(LostItemStatus.HOLDING, logs.get(1).getPreviousStatus());
        assertEquals(LostItemStatus.CONTACTED, logs.get(1).getNewStatus());
        assertTrue(logs.get(1).getNotes().contains("Đã gọi điện"));
    }

    @Test
    @DisplayName("Lễ tân bàn giao trả đồ cho khách -> Chuyển trạng thái RETURNED, lưu vết người nhận")
    void testReturnToGuest_success() {
        CreateLostItemRequest req = CreateLostItemRequest.builder()
                .roomId(testRoom.getId())
                .itemName("Ví da nam màu nâu")
                .foundLocation("Tủ đầu giường")
                .foundDate(LocalDate.now())
                .build();

        LostItemResponse created = lostItemService.create(req, housekeeper);

        ReturnLostItemRequest returnReq = ReturnLostItemRequest.builder()
                .receiverName("Nguyễn Văn Khách")
                .receiverPhone("0987654321")
                .receiverNote("Khách trực tiếp đến nhận và kiểm tra đủ giấy tờ")
                .build();

        LostItemResponse returned = lostItemService.returnToGuest(created.getId(), returnReq, receptionist);

        assertEquals(LostItemStatus.RETURNED, returned.getStatus());
        assertEquals("Nguyễn Văn Khách", returned.getReceiverName());
        assertEquals("0987654321", returned.getReceiverPhone());
        assertNotNull(returned.getReturnedAt());
        assertEquals(receptionist.getId(), returned.getReturnedById());

        // Kiểm tra log
        List<LostItemLogResponse> logs = lostItemService.getLogsByLostItemId(created.getId());
        assertEquals(2, logs.size());
        assertEquals("RETURNED_TO_GUEST", logs.get(1).getAction());
        assertEquals(LostItemStatus.RETURNED, logs.get(1).getNewStatus());

        // Thử trả lần 2 phải báo lỗi BusinessException
        assertThrows(BusinessException.class, () ->
                lostItemService.returnToGuest(created.getId(), returnReq, receptionist));
    }

    @Test
    @DisplayName("Xử lý đồ quá hạn theo chính sách -> Chuyển DISPOSED và ghi log")
    void testDisposeItem_success() {
        CreateLostItemRequest req = CreateLostItemRequest.builder()
                .roomId(testRoom.getId())
                .itemName("Áo khoác dù cũ")
                .foundLocation("Móc treo cửa")
                .foundDate(LocalDate.now().minusDays(35))
                .build();

        LostItemResponse created = lostItemService.create(req, housekeeper);

        DisposeLostItemRequest disposeReq = DisposeLostItemRequest.builder()
                .disposalMethod("Tặng từ thiện")
                .disposalNote("Quá hạn 30 ngày không liên lạc được, gom chung đợt từ thiện tháng này")
                .build();

        LostItemResponse disposed = lostItemService.disposeItem(created.getId(), disposeReq, receptionist);

        assertEquals(LostItemStatus.DISPOSED, disposed.getStatus());
        assertEquals("Tặng từ thiện", disposed.getDisposalMethod());
        assertNotNull(disposed.getDisposedAt());
        assertEquals(receptionist.getId(), disposed.getDisposedById());

        List<LostItemLogResponse> logs = lostItemService.getLogsByLostItemId(created.getId());
        assertEquals(2, logs.size());
        assertEquals("DISPOSED", logs.get(1).getAction());
    }

    @Test
    @DisplayName("Truy vấn danh sách và thống kê tổng hợp")
    void testGetAllAndSummary() {
        CreateLostItemRequest req1 = CreateLostItemRequest.builder()
                .roomId(testRoom.getId())
                .itemName("Củ sạc Samsung")
                .foundLocation("Gầm giường")
                .foundDate(LocalDate.now())
                .build();
        lostItemService.create(req1, housekeeper);

        Page<LostItemResponse> pageResult = lostItemService.getAll(
                testRoom.getId(), null, null, null, "Samsung", null, PageRequest.of(0, 10));

        assertFalse(pageResult.isEmpty());
        assertEquals("Củ sạc Samsung", pageResult.getContent().get(0).getItemName());

        LostItemSummaryResponse summary = lostItemService.getSummary();
        assertNotNull(summary);
        assertTrue(summary.getTotalHolding() >= 1);
    }
}
