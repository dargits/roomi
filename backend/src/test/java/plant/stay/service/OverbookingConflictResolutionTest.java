package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.ChannelRequest;
import plant.stay.dto.request.UpgradeRoomRequest;
import plant.stay.dto.response.ChannelResponse;
import plant.stay.dto.response.ChannelRoomBlockResponse;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.impl.ChannelCalendarSyncServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Kiểm thử toàn diện User Story NCL-15-CN-004:
 * Xử lý trùng phòng phát hiện khi đồng bộ kênh OTA cho Lễ tân và Chủ cơ sở.
 */
@SpringBootTest
@Transactional
public class OverbookingConflictResolutionTest {

    @Autowired
    private ChannelCalendarSyncService channelCalendarSyncService;

    @Autowired
    private ChannelCalendarSyncServiceImpl syncServiceImpl;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private ChannelRepository channelRepository;

    @Autowired
    private ChannelRoomBlockRepository channelRoomBlockRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private GuestRepository guestRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private User testReceptionist;
    private User testOwner;
    private RoomType doubleRoomType;      // Loại phòng đôi (6 phòng)
    private RoomType suiteRoomType;       // Loại phòng khác (phòng Suite) còn trống
    private List<Room> doubleRooms = new ArrayList<>();
    private Room suiteRoom;
    private Guest testGuest;
    private Channel testChannel;

    @BeforeEach
    void setUp() {
        testReceptionist = userRepository.findByAccount("recep_ncl15").orElseGet(() ->
                userRepository.save(User.builder()
                        .account("recep_ncl15")
                        .password("pass123")
                        .name("Lễ tân NCL15")
                        .role(Role.RECEPTIONIST)
                        .active(true)
                        .build())
        );

        testOwner = userRepository.findByAccount("owner_ncl15").orElseGet(() ->
                userRepository.save(User.builder()
                        .account("owner_ncl15")
                        .password("pass123")
                        .name("Chủ cơ sở NCL15")
                        .role(Role.OWNER)
                        .active(true)
                        .build())
        );

        // Tạo loại phòng đôi (6 phòng thực có)
        doubleRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Phòng Đôi NCL15 " + System.currentTimeMillis())
                .basePrice(BigDecimal.valueOf(800000))
                .standardCapacity(2)
                .maxCapacity(2)
                .build());

        doubleRooms.clear();
        for (int i = 1; i <= 6; i++) {
            Room r = roomRepository.save(Room.builder()
                    .roomNumber("PDOI_" + i + "_" + (System.currentTimeMillis() % 10000))
                    .roomType(doubleRoomType)
                    .status(RoomStatus.AVAILABLE)
                    .build());
            doubleRooms.add(r);
        }

        // Tạo loại phòng khác (Suite) còn trống để phục vụ đổi phòng/nâng hạng
        suiteRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Phòng Suite NCL15 " + System.currentTimeMillis())
                .basePrice(BigDecimal.valueOf(1500000))
                .standardCapacity(2)
                .maxCapacity(4)
                .build());

        suiteRoom = roomRepository.save(Room.builder()
                .roomNumber("SUITE_01_" + (System.currentTimeMillis() % 10000))
                .roomType(suiteRoomType)
                .status(RoomStatus.AVAILABLE)
                .build());

        testGuest = guestRepository.save(Guest.builder()
                .name("Nguyễn Văn An")
                .phone("0901234567")
                .build());

        // Kênh OTA liên kết với loại phòng đôi, phân bổ 2 phòng
        ChannelRequest chReq = ChannelRequest.builder()
                .name("Airbnb - Biệt thự")
                .channelCode("AIRBNB")
                .roomTypeId(doubleRoomType.getId())
                .allocatedRooms(2)
                .syncIntervalMinutes(15)
                .isActive(true)
                .build();
        ChannelResponse chRes = channelCalendarSyncService.createChannel(chReq, testOwner);
        testChannel = channelRepository.findById(chRes.getId()).orElseThrow();
    }

    @Test
    @DisplayName("NCL-15-CN-004-TC-01: 6 phòng đôi, 5 đã chiếm, kênh gửi thêm 2 khoảng bận -> không hủy đặt phòng nào, tạo cảnh báo nêu rõ kênh nguồn, thời gian và số phòng thiếu là 1")
    void testTC01_OverbookingDetectedWithExactMissingCount() {
        LocalDate start = LocalDate.now().plusDays(7);
        LocalDate end = start.plusDays(3);

        // 1. Chiếm 5 trong số 6 phòng bằng đặt phòng trực tiếp đã xác nhận
        List<Booking> existingBookings = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            Booking b = bookingRepository.save(Booking.builder()
                    .guest(testGuest)
                    .roomType(doubleRoomType)
                    .room(doubleRooms.get(i))
                    .checkInDate(start)
                    .checkOutDate(end)
                    .status(BookingStatus.CONFIRMED)
                    .expectedPrice(BigDecimal.valueOf(1600000))
                    .actualPrice(BigDecimal.valueOf(1600000))
                    .build());
            existingBookings.add(b);
        }

        // 2. Kênh gửi về 2 khoảng bận cho cùng thời điểm (5 + 2 = 7 chỗ bị chiếm / 6 phòng thực có)
        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyyMMdd");
        String icsContent = String.format("""
                BEGIN:VCALENDAR
                VERSION:2.0
                PRODID:-//Airbnb Inc//Hosting Calendar//EN
                BEGIN:VEVENT
                UID:airbnb-block-001@airbnb.com
                DTSTART;VALUE=DATE:%s
                DTEND;VALUE=DATE:%s
                SUMMARY:Airbnb Guest 1
                END:VEVENT
                BEGIN:VEVENT
                UID:airbnb-block-002@airbnb.com
                DTSTART;VALUE=DATE:%s
                DTEND;VALUE=DATE:%s
                SUMMARY:Airbnb Guest 2
                END:VEVENT
                END:VCALENDAR
                """, start.format(df), end.format(df), start.format(df), end.format(df));

        // 3. Hệ thống chạy đồng bộ
        var syncResult = syncServiceImpl.processInboundIcsContent(testChannel, icsContent, "SYNC_OVERBOOKING");

        // 4. Kiểm tra: Hệ thống KHÔNG tự hủy bất kỳ đặt phòng nào
        assertEquals(2, syncResult.getSavedCount());
        for (Booking b : existingBookings) {
            Booking refreshed = bookingRepository.findById(b.getId()).orElseThrow();
            assertEquals(BookingStatus.CONFIRMED, refreshed.getStatus(), "Hệ thống không được tự hủy đặt phòng hiện có");
        }

        // 5. Kiểm tra: Có 1 lượt chặn được gán vào phòng số 6 còn lại, và 1 lượt chặn bị xung đột
        List<ChannelRoomBlock> blocks = channelRoomBlockRepository.findByChannelId(testChannel.getId());
        assertEquals(2, blocks.size());

        ChannelRoomBlock assignedBlock = blocks.stream().filter(b -> b.getRoom() != null).findFirst().orElseThrow();
        assertEquals(doubleRooms.get(5).getId(), assignedBlock.getRoom().getId(), "Lượt chặn đầu tiên gán phòng vật lý còn lại");

        ChannelRoomBlock conflictBlock = blocks.stream().filter(b -> b.getRoom() == null).findFirst().orElseThrow();
        assertNull(conflictBlock.getRoom(), "Lượt chặn thứ hai bị thiếu phòng nên chưa gán phòng");
        assertNotNull(conflictBlock.getWarningMessage(), "Phải có cảnh báo trùng phòng");

        String warning = conflictBlock.getWarningMessage();
        // Kiểm tra đúng Acceptance Criteria: Kênh nguồn, khoảng thời gian, loại phòng, số phòng thiếu là 1
        assertTrue(warning.contains("Airbnb - Biệt thự"), "Cảnh báo phải nêu rõ kênh nguồn: " + warning);
        assertTrue(warning.contains(start.toString()), "Cảnh báo phải nêu rõ khoảng thời gian: " + warning);
        assertTrue(warning.contains("Số phòng thiếu là 1"), "Cảnh báo phải nêu rõ số phòng thiếu là một: " + warning);
        assertTrue(warning.contains("Danh sách đặt phòng đang chiếm chỗ"), "Cảnh báo phải liệt kê các đặt phòng đang chiếm chỗ: " + warning);
    }

    @Test
    @DisplayName("NCL-15-CN-004-TC-02: Đang có cảnh báo trùng phòng -> Lễ tân đổi phòng cho một khách sang loại phòng khác còn trống -> cảnh báo tự đóng")
    void testTC02_AutoCloseWarningWhenRoomOccupancyResolved() {
        LocalDate start = LocalDate.now().plusDays(10);
        LocalDate end = start.plusDays(2);

        // Chiếm hết 6 phòng bằng đặt phòng
        List<Booking> bookings = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            Booking b = bookingRepository.save(Booking.builder()
                    .guest(testGuest)
                    .roomType(doubleRoomType)
                    .room(doubleRooms.get(i))
                    .checkInDate(start)
                    .checkOutDate(end)
                    .status(BookingStatus.CHECKED_IN)
                    .expectedPrice(BigDecimal.valueOf(1600000))
                    .actualPrice(BigDecimal.valueOf(1600000))
                    .build());
            bookings.add(b);
        }

        // Kênh gửi 1 lượt chặn -> bị trùng phòng
        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyyMMdd");
        String icsContent = String.format("""
                BEGIN:VCALENDAR
                VERSION:2.0
                BEGIN:VEVENT
                UID:conflict-tc02@airbnb.com
                DTSTART;VALUE=DATE:%s
                DTEND;VALUE=DATE:%s
                SUMMARY:Airbnb Guest Conflict
                END:VEVENT
                END:VCALENDAR
                """, start.format(df), end.format(df));

        syncServiceImpl.processInboundIcsContent(testChannel, icsContent, "SYNC_CONFLICT");

        ChannelRoomBlock conflictBlock = channelRoomBlockRepository.findByChannelIdAndExternalUid(
                testChannel.getId(), "conflict-tc02@airbnb.com").orElseThrow();
        assertNull(conflictBlock.getRoom(), "Ban đầu chưa có phòng trống");
        assertNotNull(conflictBlock.getWarningMessage(), "Đang có cảnh báo trùng phòng");
        assertTrue(conflictBlock.getWarningMessage().contains("Trùng lịch"));

        // Lễ tân đổi phòng cho 1 khách sang loại phòng khác còn trống (Nâng hạng sang Suite)
        Booking bookingToMove = bookings.get(0);
        UpgradeRoomRequest upgradeReq = new UpgradeRoomRequest();
        upgradeReq.setNewRoomTypeId(suiteRoomType.getId());
        upgradeReq.setNewRoomId(suiteRoom.getId());
        upgradeReq.setReason("Nâng hạng sang phòng Suite để giải phóng phòng đôi");

        bookingService.upgradeRoom(bookingToMove.getId(), upgradeReq, testReceptionist);

        // Kiểm tra sau khi đổi phòng sang loại khác: Cảnh báo tự đóng!
        ChannelRoomBlock resolvedBlock = channelRoomBlockRepository.findById(conflictBlock.getId()).orElseThrow();
        assertNotNull(resolvedBlock.getRoom(), "Lượt chặn phải được tự động gán vào phòng vừa được giải phóng");
        assertNull(resolvedBlock.getWarningMessage(), "Cảnh báo trùng phòng phải tự động đóng (warningMessage = null)");

        // Kiểm tra trên Sơ đồ lịch phòng: Không còn cờ hasConflict
        List<?> calendarItems = bookingService.getCalendar(start, end);
        boolean foundUnresolvedConflict = calendarItems.stream()
                .anyMatch(item -> item instanceof Map<?, ?> m && Boolean.TRUE.equals(m.get("hasConflict")));
        assertFalse(foundUnresolvedConflict, "Trên sơ đồ lịch phòng không còn cảnh báo trùng phòng");
    }

    @Test
    @DisplayName("NCL-15-CN-004-TC-03: Không cho sửa tay lượt chặn trên lịch, cho phép từ chối lượt chặn kèm ghi chú lý do")
    void testTC03_BlockCannotBeEditedManually_CanBeRejectedWithNote() {
        LocalDate start = LocalDate.now().plusDays(15);
        LocalDate end = start.plusDays(3);

        // Tạo 1 lượt chặn có xung đột
        ChannelRoomBlock block = ChannelRoomBlock.builder()
                .channel(testChannel)
                .roomType(doubleRoomType)
                .room(null)
                .externalUid("manual-edit-check-uid")
                .startDate(start)
                .endDate(end)
                .summary("Hold Airbnb")
                .status("BLOCKED")
                .isExcess(false)
                .warningMessage("Trùng lịch với đặt phòng hiện có")
                .build();
        block = channelRoomBlockRepository.save(block);

        // Từ chối không có lý do -> Bị chặn
        final Long blockId = block.getId();
        assertThrows(IllegalArgumentException.class, () ->
                channelCalendarSyncService.rejectBlock(blockId, "", testReceptionist));

        // Lễ tân từ chối lượt chặn kèm ghi chú lý do
        ChannelRoomBlockResponse rejected = channelCalendarSyncService.rejectBlock(
                blockId, "Không thỏa thuận được đổi ngày với khách, kênh từ chối hủy", testReceptionist);

        assertEquals("REJECTED", rejected.getStatus());
        assertEquals("Không thỏa thuận được đổi ngày với khách, kênh từ chối hủy", rejected.getRejectReason());
        assertNull(rejected.getWarningMessage(), "Cảnh báo đã được xóa sau khi từ chối");

        // Không thể từ chối lại lượt đã REJECTED
        assertThrows(IllegalArgumentException.class, () ->
                channelCalendarSyncService.rejectBlock(blockId, "Từ chối lại", testReceptionist));
    }

    @Test
    @DisplayName("NCL-15-CN-004-TC-04: Cảnh báo được gửi tới Lễ tân và Chủ cơ sở qua trung tâm thông báo khi phát hiện trùng phòng")
    void testTC04_NotificationPushedToReceptionistAndOwner() {
        LocalDate start = LocalDate.now().plusDays(20);
        LocalDate end = start.plusDays(2);

        // Chiếm hết phòng
        for (int i = 0; i < 6; i++) {
            bookingRepository.save(Booking.builder()
                    .guest(testGuest)
                    .roomType(doubleRoomType)
                    .room(doubleRooms.get(i))
                    .checkInDate(start)
                    .checkOutDate(end)
                    .status(BookingStatus.CONFIRMED)
                    .expectedPrice(BigDecimal.valueOf(1600000))
                    .actualPrice(BigDecimal.valueOf(1600000))
                    .build());
        }

        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyyMMdd");
        String icsContent = String.format("""
                BEGIN:VCALENDAR
                VERSION:2.0
                BEGIN:VEVENT
                UID:notif-test@airbnb.com
                DTSTART;VALUE=DATE:%s
                DTEND;VALUE=DATE:%s
                SUMMARY:Airbnb Guest Notification Check
                END:VEVENT
                END:VCALENDAR
                """, start.format(df), end.format(df));

        syncServiceImpl.processInboundIcsContent(testChannel, icsContent, "SYNC_NOTIF");

        // Kiểm tra thông báo được gửi
        List<Notification> notifs = notificationRepository.findAll().stream()
                .filter(n -> n.getType() == NotificationType.CHANNEL_OVERBOOKING_CONFLICT)
                .toList();

        assertFalse(notifs.isEmpty(), "Phải tạo thông báo loại CHANNEL_OVERBOOKING_CONFLICT");
        assertTrue(notifs.stream().anyMatch(n -> n.getUser().getRole() == Role.RECEPTIONIST),
                "Lễ tân phải nhận được thông báo");
        assertTrue(notifs.stream().anyMatch(n -> n.getUser().getRole() == Role.OWNER),
                "Chủ cơ sở phải nhận được thông báo");
    }
}
