package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.BookingRequest;
import plant.stay.dto.request.ChannelRequest;
import plant.stay.dto.request.ConvertBlockToBookingRequest;
import plant.stay.dto.response.BookingResponse;
import plant.stay.dto.response.ChannelCalendarSyncLogResponse;
import plant.stay.dto.response.ChannelResponse;
import plant.stay.dto.response.ChannelRoomBlockResponse;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.impl.ChannelCalendarSyncServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class ChannelCalendarSyncInboundTest {

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
    private ChannelCalendarSyncLogRepository syncLogRepository;

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

    private User testReceptionist;
    private RoomType testRoomType;
    private Room testRoom1;
    private Room testRoom2;
    private Guest testGuest;
    private Channel testChannel;

    @BeforeEach
    void setUp() {
        testReceptionist = userRepository.findByAccount("recep_test_sync").orElseGet(() ->
                userRepository.save(User.builder()
                        .account("recep_test_sync")
                        .password("pass123")
                        .name("Lễ tân Test")
                        .role(Role.RECEPTIONIST)
                        .active(true)
                        .build())
        );

        testRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe Inbound " + System.currentTimeMillis())
                .basePrice(BigDecimal.valueOf(1000000))
                .standardCapacity(2)
                .maxCapacity(2)
                .build());

        testRoom1 = roomRepository.save(Room.builder()
                .roomNumber("R_IN1_" + (System.currentTimeMillis() % 100000))
                .roomType(testRoomType)
                .status(RoomStatus.AVAILABLE)
                .build());

        testRoom2 = roomRepository.save(Room.builder()
                .roomNumber("R_IN2_" + (System.currentTimeMillis() % 100000))
                .roomType(testRoomType)
                .status(RoomStatus.AVAILABLE)
                .build());

        testGuest = guestRepository.save(Guest.builder()
                .name("Trần Văn Khách")
                .phone("0912345678")
                .build());

        ChannelRequest chReq = ChannelRequest.builder()
                .name("Airbnb - Biệt thự biển")
                .channelCode("AIRBNB")
                .roomTypeId(testRoomType.getId())
                .allocatedRooms(1) // Phân bổ 1 phòng
                .syncIntervalMinutes(15)
                .isActive(true)
                .build();
        ChannelResponse chRes = channelCalendarSyncService.createChannel(chReq, testReceptionist);
        testChannel = channelRepository.findById(chRes.getId()).orElseThrow();
    }

    @Test
    @DisplayName("1. Phân tích cú pháp tệp iCalendar RFC 5545 trích xuất chính xác VEVENT")
    void testParseIcsContent() {
        String icsSample = """
                BEGIN:VCALENDAR
                VERSION:2.0
                PRODID:-//Airbnb Inc//Hosting Calendar//EN
                BEGIN:VEVENT
                UID:event-123@airbnb.com
                DTSTART;VALUE=DATE:20261010
                DTEND;VALUE=DATE:20261013
                SUMMARY:Airbnb (Not available)
                DESCRIPTION:Reservation on Airbnb
                END:VEVENT
                BEGIN:VEVENT
                UID:event-456@airbnb.com
                DTSTART:20261101T140000Z
                DTEND:20261105T120000Z
                SUMMARY:Reserved - John Doe
                END:VEVENT
                END:VCALENDAR
                """;

        List<ChannelCalendarSyncServiceImpl.ParsedIcsEvent> events = syncServiceImpl.parseIcsContent(icsSample);
        assertEquals(2, events.size());

        ChannelCalendarSyncServiceImpl.ParsedIcsEvent ev1 = events.get(0);
        assertEquals("event-123@airbnb.com", ev1.getUid());
        assertEquals(LocalDate.of(2026, 10, 10), ev1.getStartDate());
        assertEquals(LocalDate.of(2026, 10, 13), ev1.getEndDate());
        assertEquals("Airbnb (Not available)", ev1.getSummary());

        ChannelCalendarSyncServiceImpl.ParsedIcsEvent ev2 = events.get(1);
        assertEquals("event-456@airbnb.com", ev2.getUid());
        assertEquals(LocalDate.of(2026, 11, 1), ev2.getStartDate());
        assertEquals(LocalDate.of(2026, 11, 5), ev2.getEndDate());
        assertEquals("Reserved - John Doe", ev2.getSummary());
    }

    @Test
    @DisplayName("2. Nhận lịch bận và tạo lượt chặn phòng gắn đúng loại phòng và phòng vật lý")
    void testProcessInboundIcsAndCreateBlocks() {
        LocalDate start = LocalDate.now().plusDays(5);
        LocalDate end = start.plusDays(3);
        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyyMMdd");

        String icsContent = String.format("""
                BEGIN:VCALENDAR
                VERSION:2.0
                BEGIN:VEVENT
                UID:res-airbnb-001@airbnb.com
                DTSTART;VALUE=DATE:%s
                DTEND;VALUE=DATE:%s
                SUMMARY:Airbnb (Reserved)
                END:VEVENT
                END:VCALENDAR
                """, start.format(df), end.format(df));

        var result = syncServiceImpl.processInboundIcsContent(testChannel, icsContent, "TEST_SYNC");
        assertEquals(1, result.getSavedCount());
        assertEquals(0, result.getExcessCount());

        List<ChannelRoomBlock> blocks = channelRoomBlockRepository.findByChannelId(testChannel.getId());
        assertEquals(1, blocks.size());

        ChannelRoomBlock block = blocks.get(0);
        assertEquals("res-airbnb-001@airbnb.com", block.getExternalUid());
        assertEquals(start, block.getStartDate());
        assertEquals(end, block.getEndDate());
        assertEquals("BLOCKED", block.getStatus());
        assertFalse(block.getIsExcess());
        assertNotNull(block.getRoom(), "Phải tự động gán 1 phòng vật lý khả dụng để hiển thị trên sơ đồ");
        assertEquals(testRoomType.getId(), block.getRoomType().getId());
    }

    @Test
    @DisplayName("3. Kiểm tra hạn mức phân bổ (allocatedRooms): Vượt phân bổ thì ghi cảnh báo WARNING")
    void testAllocationLimitAndExcessWarning() {
        // testChannel có allocatedRooms = 1
        // Gửi tệp có 2 VEVENT trùng cùng một khoảng ngày
        LocalDate start = LocalDate.now().plusDays(10);
        LocalDate end = start.plusDays(4);
        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyyMMdd");

        String icsContent = String.format("""
                BEGIN:VCALENDAR
                VERSION:2.0
                BEGIN:VEVENT
                UID:res-excess-001@airbnb.com
                DTSTART;VALUE=DATE:%s
                DTEND;VALUE=DATE:%s
                SUMMARY:Airbnb Reserved 1
                END:VEVENT
                BEGIN:VEVENT
                UID:res-excess-002@airbnb.com
                DTSTART;VALUE=DATE:%s
                DTEND;VALUE=DATE:%s
                SUMMARY:Airbnb Reserved 2
                END:VEVENT
                END:VCALENDAR
                """, start.format(df), end.format(df), start.format(df), end.format(df));

        var result = syncServiceImpl.processInboundIcsContent(testChannel, icsContent, "TEST_EXCESS");
        assertEquals(2, result.getSavedCount());
        assertEquals(1, result.getExcessCount(), "Phải phát hiện 1 lượt đặt vượt hạn mức phân bổ");
        assertFalse(result.getWarnings().isEmpty(), "Phải có thông điệp cảnh báo vượt phân bổ");

        List<ChannelRoomBlock> blocks = channelRoomBlockRepository.findByChannelId(testChannel.getId());
        assertEquals(2, blocks.size());

        long normalCount = blocks.stream().filter(b -> !b.getIsExcess()).count();
        long excessCount = blocks.stream().filter(ChannelRoomBlock::getIsExcess).count();
        assertEquals(1, normalCount);
        assertEquals(1, excessCount);

        ChannelRoomBlock excessBlock = blocks.stream().filter(ChannelRoomBlock::getIsExcess).findFirst().orElseThrow();
        assertNull(excessBlock.getRoom(), "Lượt chặn vượt phân bổ không được chiếm phòng vật lý");
        assertTrue(excessBlock.getWarningMessage().contains("Vượt số phòng phân bổ"));
    }

    @Test
    @DisplayName("4. Tự động gỡ bỏ lượt chặn khi khoảng bận biến mất khỏi tệp lịch của kênh")
    void testAutomaticUnblockingWhenEventDisappears() {
        LocalDate start1 = LocalDate.now().plusDays(20);
        LocalDate end1 = start1.plusDays(2);
        LocalDate start2 = LocalDate.now().plusDays(25);
        LocalDate end2 = start2.plusDays(3);
        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyyMMdd");

        // Lần 1: Có 2 sự kiện
        String ics1 = String.format("""
                BEGIN:VCALENDAR
                VERSION:2.0
                BEGIN:VEVENT
                UID:uid-keep@airbnb.com
                DTSTART;VALUE=DATE:%s
                DTEND;VALUE=DATE:%s
                SUMMARY:Event 1
                END:VEVENT
                BEGIN:VEVENT
                UID:uid-cancel@airbnb.com
                DTSTART;VALUE=DATE:%s
                DTEND;VALUE=DATE:%s
                SUMMARY:Event 2
                END:VEVENT
                END:VCALENDAR
                """, start1.format(df), end1.format(df), start2.format(df), end2.format(df));

        syncServiceImpl.processInboundIcsContent(testChannel, ics1, "SYNC_1");
        assertEquals(2, channelRoomBlockRepository.findByChannelId(testChannel.getId()).size());

        // Lần 2: Khách hủy Event 2, tệp chỉ còn Event 1
        String ics2 = String.format("""
                BEGIN:VCALENDAR
                VERSION:2.0
                BEGIN:VEVENT
                UID:uid-keep@airbnb.com
                DTSTART;VALUE=DATE:%s
                DTEND;VALUE=DATE:%s
                SUMMARY:Event 1
                END:VEVENT
                END:VCALENDAR
                """, start1.format(df), end1.format(df));

        syncServiceImpl.processInboundIcsContent(testChannel, ics2, "SYNC_2");
        List<ChannelRoomBlock> remaining = channelRoomBlockRepository.findByChannelId(testChannel.getId());
        assertEquals(1, remaining.size(), "Lượt chặn Event 2 phải được tự động gỡ bỏ khi biến mất khỏi tệp kênh");
        assertEquals("uid-keep@airbnb.com", remaining.get(0).getExternalUid());
    }

    @Test
    @DisplayName("5. Chuyển đổi lượt chặn thành đặt phòng chính thức, giữ nguyên liên kết tới kênh nguồn")
    void testConvertBlockToOfficialBooking() {
        LocalDate start = LocalDate.now().plusDays(15);
        LocalDate end = start.plusDays(3);
        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyyMMdd");

        String ics = String.format("""
                BEGIN:VCALENDAR
                VERSION:2.0
                BEGIN:VEVENT
                UID:booking-convert-test@airbnb.com
                DTSTART;VALUE=DATE:%s
                DTEND;VALUE=DATE:%s
                SUMMARY:Airbnb Guest Jane
                END:VEVENT
                END:VCALENDAR
                """, start.format(df), end.format(df));

        syncServiceImpl.processInboundIcsContent(testChannel, ics, "PRE_CONVERT");
        ChannelRoomBlock block = channelRoomBlockRepository.findByChannelIdAndExternalUid(testChannel.getId(), "booking-convert-test@airbnb.com")
                .orElseThrow();
        assertEquals("BLOCKED", block.getStatus());

        // Lễ tân chuyển đổi lượt chặn thành đặt phòng chính thức
        ConvertBlockToBookingRequest req = ConvertBlockToBookingRequest.builder()
                .guestName("Jane Smith")
                .guestPhone("0988776655")
                .guestEmail("janesmith@example.com")
                .guestIdNumber("001202003344")
                .expectedPrice(BigDecimal.valueOf(3500000))
                .depositAmount(BigDecimal.valueOf(1000000))
                .note("Khách đặt qua Airbnb, đã cọc 1tr qua sàn")
                .build();

        BookingResponse bookingRes = channelCalendarSyncService.convertBlockToBooking(block.getId(), req, testReceptionist);

        assertNotNull(bookingRes);
        assertNotNull(bookingRes.getId());
        assertEquals("Jane Smith", bookingRes.getGuestName());
        assertEquals(start, bookingRes.getCheckInDate());
        assertEquals(end, bookingRes.getCheckOutDate());
        assertEquals(BookingStatus.CONFIRMED, bookingRes.getStatus());
        assertEquals("AIRBNB", bookingRes.getSource());
        assertEquals(testChannel.getId(), bookingRes.getChannelId(), "Phải giữ nguyên liên kết tới kênh nguồn");
        assertEquals("Airbnb - Biệt thự biển", bookingRes.getChannelName());

        // Kiểm tra block đã đổi trạng thái thành CONVERTED
        ChannelRoomBlock updatedBlock = channelRoomBlockRepository.findById(block.getId()).orElseThrow();
        assertEquals("CONVERTED", updatedBlock.getStatus());
        assertNotNull(updatedBlock.getConvertedBooking());
        assertEquals(bookingRes.getId(), updatedBlock.getConvertedBooking().getId());

        // Đồng bộ lại tệp lịch: Block đã convert không bị gỡ bỏ hoặc tạo lại
        syncServiceImpl.processInboundIcsContent(testChannel, ics, "POST_CONVERT_SYNC");
        ChannelRoomBlock afterSync = channelRoomBlockRepository.findById(block.getId()).orElseThrow();
        assertEquals("CONVERTED", afterSync.getStatus());
    }

    @Test
    @DisplayName("6. Chống trùng phòng: Không cho đặt trực tiếp trùng vào phòng đang bị kênh giữ")
    void testPreventDirectBookingConflictOnBlockedRoom() {
        LocalDate start = LocalDate.now().plusDays(2);
        LocalDate end = start.plusDays(3);

        // Tạo 1 lượt chặn gắn vào testRoom1
        ChannelRoomBlock block = ChannelRoomBlock.builder()
                .channel(testChannel)
                .roomType(testRoomType)
                .room(testRoom1)
                .externalUid("conflict-check-uid")
                .startDate(start)
                .endDate(end)
                .summary("Airbnb Hold")
                .status("BLOCKED")
                .isExcess(false)
                .build();
        channelRoomBlockRepository.save(block);

        // Cố gắng tạo đặt phòng trực tiếp trùng phòng testRoom1 và trùng ngày
        BookingRequest conflictReq = new BookingRequest();
        conflictReq.setGuestId(testGuest.getId());
        conflictReq.setRoomTypeId(testRoomType.getId());
        conflictReq.setRoomId(testRoom1.getId());
        conflictReq.setCheckInDate(start);
        conflictReq.setCheckOutDate(end);

        Exception ex = assertThrows(IllegalArgumentException.class, () ->
                bookingService.create(conflictReq, testReceptionist));
        assertTrue(ex.getMessage().contains("Phòng đã bị giữ bởi kênh phân phối") || ex.getMessage().contains("chặn phòng kênh"),
                "Thông báo lỗi phải cảnh báo rõ phòng đang bị kênh giữ: " + ex.getMessage());
    }

    @Test
    @DisplayName("7. Sơ đồ lịch phòng (getCalendar) trả về đầy đủ lượt chặn kênh với nhãn và cờ riêng")
    void testBookingCalendarIncludesChannelBlocks() {
        LocalDate start = LocalDate.now().plusDays(1);
        LocalDate end = start.plusDays(2);

        ChannelRoomBlock block = ChannelRoomBlock.builder()
                .channel(testChannel)
                .roomType(testRoomType)
                .room(testRoom1)
                .externalUid("calendar-display-uid")
                .startDate(start)
                .endDate(end)
                .summary("Kênh giữ chỗ")
                .status("BLOCKED")
                .isExcess(false)
                .build();
        channelRoomBlockRepository.save(block);

        List<?> calendarItems = bookingService.getCalendar(start.minusDays(1), end.plusDays(1));
        assertFalse(calendarItems.isEmpty());

        boolean foundChannelBlock = false;
        for (Object item : calendarItems) {
            if (item instanceof Map<?, ?> map) {
                if (Boolean.TRUE.equals(map.get("isChannelBlock"))) {
                    foundChannelBlock = true;
                    assertEquals("CHANNEL_BLOCKED", map.get("status"));
                    assertEquals(testChannel.getId(), map.get("channelId"));
                    assertTrue(map.get("guestName").toString().contains("Kênh giữ chỗ"));
                    assertEquals(testRoom1.getId(), map.get("roomId"));
                }
            }
        }
        assertTrue(foundChannelBlock, "Lịch phòng phải chứa lượt chặn từ kênh phân phối");
    }
}
