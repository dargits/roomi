package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.ChannelRequest;
import plant.stay.dto.response.ChannelCalendarSyncLogResponse;
import plant.stay.dto.response.ChannelResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class ChannelCalendarSyncServiceTest {

    @Autowired
    private ChannelCalendarSyncService channelCalendarSyncService;

    @Autowired
    private ChannelRepository channelRepository;

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

    private User testOwner;
    private RoomType testRoomType;
    private Guest testGuest;

    @BeforeEach
    void setUp() {
        testOwner = userRepository.findByAccount("owner_test_sync").orElseGet(() ->
                userRepository.save(User.builder()
                        .account("owner_test_sync")
                        .password("pass123")
                        .name("Chủ cơ sở Test Sync")
                        .role(Role.OWNER)
                        .active(true)
                        .build())
        );

        testRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe Double Test Sync " + System.currentTimeMillis())
                .basePrice(BigDecimal.valueOf(800000))
                .standardCapacity(2)
                .maxCapacity(2)
                .build());

        // Tạo sẵn 5 phòng thực tế cho testRoomType để đủ quota phân bổ
        for (int i = 1; i <= 5; i++) {
            roomRepository.save(Room.builder()
                    .roomNumber("R_SYNC_" + (System.currentTimeMillis() % 100000) + "_" + i)
                    .roomType(testRoomType)
                    .status(RoomStatus.AVAILABLE)
                    .build());
        }

        testGuest = guestRepository.save(Guest.builder()
                .name("Nguyễn Văn Khách")
                .phone("0987654321")
                .build());
    }

    @Test
    @DisplayName("Tạo kênh mới sinh mã token bảo mật 64 ký tự và tệp lịch ban đầu")
    void testCreateChannelAndTokenGeneration() {
        ChannelRequest req = ChannelRequest.builder()
                .name("Airbnb - Deluxe Test")
                .channelCode("AIRBNB")
                .roomTypeId(testRoomType.getId())
                .allocatedRooms(2)
                .syncIntervalMinutes(15)
                .isActive(true)
                .build();

        ChannelResponse response = channelCalendarSyncService.createChannel(req, testOwner);

        assertNotNull(response);
        assertNotNull(response.getId());
        assertEquals("Airbnb - Deluxe Test", response.getName());
        assertEquals(2, response.getAllocatedRooms());

        // Kiểm tra token bảo mật khó đoán (64 ký tự hex)
        assertNotNull(response.getFeedToken());
        assertEquals(64, response.getFeedToken().length());
        assertTrue(response.getFeedUrl().contains("/api/public/calendar/feeds/" + response.getFeedToken() + ".ics"));

        // Kiểm tra nội dung tệp .ics đã được sinh sẵn
        String icsContent = channelCalendarSyncService.getIcsFeedContent(response.getFeedToken());
        assertNotNull(icsContent);
        assertTrue(icsContent.contains("BEGIN:VCALENDAR"));
        assertTrue(icsContent.contains("END:VCALENDAR"));

        // Kiểm tra nhật ký sinh tệp ban đầu được ghi
        List<ChannelCalendarSyncLogResponse> logs = channelCalendarSyncService.getLogsByChannelId(response.getId());
        assertFalse(logs.isEmpty());
        assertEquals("INITIAL_CREATION", logs.get(0).getTriggeredBy());
        assertEquals("SUCCESS", logs.get(0).getStatus());
    }

    @Test
    @DisplayName("Tính toán số phòng còn bán được: Booking tạm giữ chỗ (NEW) và phòng bảo trì đều tính là bị chiếm")
    void testAvailabilityFormulaAndBlockedPeriods() {
        // Phân bổ 2 phòng cho kênh này
        ChannelRequest req = ChannelRequest.builder()
                .name("Booking.com - Suite")
                .channelCode("BOOKING_COM")
                .roomTypeId(testRoomType.getId())
                .allocatedRooms(2)
                .syncIntervalMinutes(30)
                .isActive(true)
                .build();

        ChannelResponse channel = channelCalendarSyncService.createChannel(req, testOwner);

        LocalDate today = LocalDate.now();
        LocalDate d2 = today.plusDays(2);
        LocalDate d3 = today.plusDays(3);
        LocalDate d4 = today.plusDays(4);
        LocalDate d5 = today.plusDays(5);

        // 1. Tạo 1 phòng thuộc loại này đang ở trạng thái MAINTENANCE (bảo trì)
        Room maintenanceRoom = roomRepository.save(Room.builder()
                .roomNumber("M" + (System.currentTimeMillis() % 1000000))
                .roomType(testRoomType)
                .status(RoomStatus.MAINTENANCE)
                .build());

        // 2. Tạo 1 booking CONFIRMED từ ngày d2 -> d4 (2 đêm: d2, d3)
        bookingRepository.save(Booking.builder()
                .guest(testGuest)
                .roomType(testRoomType)
                .checkInDate(d2)
                .checkOutDate(d4)
                .status(BookingStatus.CONFIRMED)
                .expectedPrice(BigDecimal.valueOf(1600000))
                .build());

        // 3. Tạo 1 booking NEW (giữ chỗ tạm thời) từ ngày d3 -> d5 (2 đêm: d3, d4)
        bookingRepository.save(Booking.builder()
                .guest(testGuest)
                .roomType(testRoomType)
                .checkInDate(d3)
                .checkOutDate(d5)
                .status(BookingStatus.NEW)
                .expectedPrice(BigDecimal.valueOf(1600000))
                .build());

        // Phân tích theo từng ngày:
        // - Ngày d1: 0 booking + 1 bảo trì = 1 occupied. Còn lại = 2 - 1 = 1 > 0 -> CÒN CHỖ.
        // - Ngày d2: 1 booking (CONFIRMED) + 1 bảo trì = 2 occupied. Còn lại = 2 - 2 = 0 <= 0 -> HẾT CHỖ!
        // - Ngày d3: 2 booking (CONFIRMED + NEW) + 1 bảo trì = 3 occupied. Còn lại = 2 - 3 = -1 <= 0 -> HẾT CHỖ!
        // - Ngày d4: 1 booking (NEW) + 1 bảo trì = 2 occupied. Còn lại = 2 - 2 = 0 <= 0 -> HẾT CHỖ!
        // - Ngày d5: 0 booking + 1 bảo trì = 1 occupied. Còn lại = 2 - 1 = 1 > 0 -> CÒN CHỖ.
        // Như vậy khoảng ngày bị chặn liên tiếp là từ d2 đến d4 (check-in d2, check-out d5).

        ChannelResponse syncedChannel = channelCalendarSyncService.syncChannel(channel.getId(), "TEST_FORMULA");

        // Kiểm tra số khoảng thời gian đã chặn
        assertTrue(syncedChannel.getLastBlockedPeriodsCount() >= 1);

        String icsContent = channelCalendarSyncService.getIcsFeedContent(syncedChannel.getFeedToken());
        assertTrue(icsContent.contains("BEGIN:VEVENT"));
        assertTrue(icsContent.contains("SUMMARY:Unavailable - Hết chỗ"));

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyyMMdd");
        // Kiểm tra DTSTART và DTEND của khoảng bị chặn: d2 đến d5
        String expectedStart = "DTSTART;VALUE=DATE:" + d2.format(dtf);
        String expectedEnd = "DTEND;VALUE=DATE:" + d5.format(dtf);
        assertTrue(icsContent.contains(expectedStart), "iCal feed phải chứa " + expectedStart);
        assertTrue(icsContent.contains(expectedEnd), "iCal feed phải chứa " + expectedEnd);

        // Kiểm tra log ghi nhận số khoảng thời gian đã chặn
        List<ChannelCalendarSyncLogResponse> logs = channelCalendarSyncService.getLogsByChannelId(channel.getId());
        ChannelCalendarSyncLogResponse latestLog = logs.get(0);
        assertTrue(latestLog.getBlockedPeriodsCount() >= 1);
        assertEquals("TEST_FORMULA", latestLog.getTriggeredBy());
        assertTrue(latestLog.getBlockedSummary().contains(d2.toString()));
    }

    @Test
    @DisplayName("Làm mới token khi Chủ cơ sở nghi ngờ bị lộ: Token cũ bị vô hiệu hóa, sinh token mới")
    void testRefreshTokenInvalidatesOldAndGeneratesNew() {
        ChannelRequest req = ChannelRequest.builder()
                .name("Agoda - Test Refresh")
                .channelCode("AGODA")
                .roomTypeId(testRoomType.getId())
                .allocatedRooms(1)
                .build();

        ChannelResponse channel = channelCalendarSyncService.createChannel(req, testOwner);
        String oldToken = channel.getFeedToken();

        // Đảm bảo token cũ truy cập được
        assertNotNull(channelCalendarSyncService.getIcsFeedContent(oldToken));

        // Chủ cơ sở bấm làm mới token
        ChannelResponse refreshed = channelCalendarSyncService.refreshToken(channel.getId(), testOwner);
        String newToken = refreshed.getFeedToken();

        assertNotEquals(oldToken, newToken);
        assertEquals(64, newToken.length());

        // Token mới truy cập thành công
        String newIcs = channelCalendarSyncService.getIcsFeedContent(newToken);
        assertNotNull(newIcs);
        assertTrue(newIcs.contains("BEGIN:VCALENDAR"));

        // Token cũ bị vô hiệu hóa hoàn toàn (ném ngoại lệ ResourceNotFoundException)
        assertThrows(ResourceNotFoundException.class, () -> {
            channelCalendarSyncService.getIcsFeedContent(oldToken);
        });

        // Kiểm tra log ghi nhận TOKEN_REGENERATED
        List<ChannelCalendarSyncLogResponse> logs = channelCalendarSyncService.getLogsByChannelId(channel.getId());
        assertEquals("TOKEN_REGENERATED", logs.get(0).getTriggeredBy());
    }

    @Test
    @DisplayName("Xóa kênh phân phối thành công: tự động dọn dẹp toàn bộ nhật ký liên quan, không lỗi khóa ngoại")
    void testDeleteChannelCascadesAndRemovesLogs() {
        ChannelRequest req = ChannelRequest.builder()
                .name("Kênh Test Delete")
                .channelCode("OTHER")
                .roomTypeId(testRoomType.getId())
                .allocatedRooms(1)
                .build();

        ChannelResponse channel = channelCalendarSyncService.createChannel(req, testOwner);

        // Kênh đã có log sinh tệp ban đầu
        List<ChannelCalendarSyncLogResponse> logsBefore = channelCalendarSyncService.getLogsByChannelId(channel.getId());
        assertFalse(logsBefore.isEmpty());

        // Thực hiện xóa kênh
        assertDoesNotThrow(() -> {
            channelCalendarSyncService.deleteChannel(channel.getId(), testOwner);
        });

        // Đảm bảo kênh và log của kênh đã được dọn dẹp sạch sẽ
        assertThrows(ResourceNotFoundException.class, () -> {
            channelCalendarSyncService.getChannelById(channel.getId());
        });
        List<ChannelCalendarSyncLogResponse> logsAfter = channelCalendarSyncService.getLogsByChannelId(channel.getId());
        assertTrue(logsAfter.isEmpty());
    }

    @Test
    @DisplayName("Chặn phân bổ vượt quá số phòng thực có của loại phòng trên các kênh đang active")
    void testOverAllocationBlocked() {
        // testRoomType có 5 phòng thực tế
        // Kênh 1: phân bổ 3 phòng -> thành công (còn 2 phòng)
        ChannelRequest req1 = ChannelRequest.builder()
                .name("Kênh 1 - Airbnb")
                .channelCode("AIRBNB")
                .roomTypeId(testRoomType.getId())
                .allocatedRooms(3)
                .isActive(true)
                .build();
        ChannelResponse c1 = channelCalendarSyncService.createChannel(req1, testOwner);
        assertNotNull(c1);

        // Kênh 2: phân bổ thêm 3 phòng -> tổng 3 + 3 = 6 > 5 phòng thực có -> PHẢI BỊ CHẶN
        ChannelRequest req2 = ChannelRequest.builder()
                .name("Kênh 2 - Booking.com")
                .channelCode("BOOKING_COM")
                .roomTypeId(testRoomType.getId())
                .allocatedRooms(3)
                .isActive(true)
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            channelCalendarSyncService.createChannel(req2, testOwner);
        });
        assertTrue(ex.getMessage().contains("vượt quá số phòng thực có"));

        // Kênh 2 tạo với trạng thái tắt (isActive = false) thì vẫn cho phép lưu
        req2.setIsActive(false);
        ChannelResponse c2 = channelCalendarSyncService.createChannel(req2, testOwner);
        assertNotNull(c2);
        assertFalse(c2.getIsActive());

        // Khi bật toggleActive kênh 2 lên -> hệ thống kiểm tra và chặn kích hoạt
        IllegalArgumentException toggleEx = assertThrows(IllegalArgumentException.class, () -> {
            channelCalendarSyncService.toggleActive(c2.getId(), testOwner);
        });
        assertTrue(toggleEx.getMessage().contains("vượt quá số phòng thực có"));
    }

    @Test
    @DisplayName("Kênh chưa ánh xạ loại phòng thì không được bật đồng bộ")
    void testCannotActivateChannelWithoutMappings() {
        ChannelRequest req = ChannelRequest.builder()
                .name("Kênh Trống Mapping")
                .channelCode("OTHER")
                .isActive(true) // Cố tình bật đồng bộ khi không truyền mapping nào
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            channelCalendarSyncService.createChannel(req, testOwner);
        });
        assertTrue(ex.getMessage().contains("chưa ánh xạ đủ loại phòng"));
    }

    @Test
    @DisplayName("Bật / tắt từng kênh bất cứ lúc nào: tắt kênh không xóa dữ liệu và nhật ký cũ")
    void testToggleActivePreservesDataAndLogs() {
        ChannelRequest req = ChannelRequest.builder()
                .name("Kênh Toggle Test")
                .channelCode("AIRBNB")
                .roomTypeId(testRoomType.getId())
                .allocatedRooms(2)
                .isActive(true)
                .build();

        ChannelResponse channel = channelCalendarSyncService.createChannel(req, testOwner);
        assertTrue(channel.getIsActive());

        // Đã có 1 log ban đầu
        List<ChannelCalendarSyncLogResponse> logsInitial = channelCalendarSyncService.getLogsByChannelId(channel.getId());
        assertEquals(1, logsInitial.size());

        // Chủ cơ sở tắt kênh
        ChannelResponse turnedOff = channelCalendarSyncService.toggleActive(channel.getId(), testOwner);
        assertFalse(turnedOff.getIsActive());

        // Kiểm tra: Dữ liệu tệp lịch và nhật ký cũ KHÔNG bị xóa
        List<ChannelCalendarSyncLogResponse> logsAfterOff = channelCalendarSyncService.getLogsByChannelId(channel.getId());
        assertEquals(1, logsAfterOff.size(), "Nhật ký cũ vẫn phải được lưu giữ nguyên");

        // Khi kênh đang tắt, bot truy cập lấy feed thì báo ngưng đồng bộ
        assertThrows(IllegalStateException.class, () -> {
            channelCalendarSyncService.getIcsFeedContent(channel.getFeedToken());
        });

        // Chủ cơ sở bật lại kênh
        ChannelResponse turnedOn = channelCalendarSyncService.toggleActive(channel.getId(), testOwner);
        assertTrue(turnedOn.getIsActive());

        // Bot truy cập lại bình thường
        String ics = channelCalendarSyncService.getIcsFeedContent(channel.getFeedToken());
        assertNotNull(ics);
        assertTrue(ics.contains("BEGIN:VCALENDAR"));
    }

    @Test
    @DisplayName("Kiểm tra loại phòng khách muốn đặt trên kênh: Còn phòng vs Hết phòng theo ngày nhận trả")
    void testCheckAvailabilityForDates() {
        // Phân bổ 2 phòng cho kênh này
        ChannelRequest req = ChannelRequest.builder()
                .name("Kênh Check Phân Bổ")
                .channelCode("BOOKING_COM")
                .roomTypeId(testRoomType.getId())
                .allocatedRooms(2)
                .isActive(true)
                .build();
        ChannelResponse channel = channelCalendarSyncService.createChannel(req, testOwner);

        LocalDate d1 = LocalDate.now().plusDays(10);
        LocalDate d2 = d1.plusDays(1);
        LocalDate d3 = d1.plusDays(2);
        LocalDate d4 = d1.plusDays(3);

        // Trường hợp 1: Chưa có ai đặt -> CÒN PHÒNG (available = 2)
        plant.stay.dto.response.ChannelAvailabilityCheckResponse check1 = channelCalendarSyncService.checkAvailability(
                channel.getId(), testRoomType.getId(), null, d1, d3);
        assertTrue(check1.getIsAvailable());
        assertEquals("AVAILABLE", check1.getStatus());
        assertEquals(2, check1.getAvailableRooms());
        assertEquals(2, check1.getTotalNights());
        assertFalse(check1.getDailyDetails().isEmpty());
        assertFalse(check1.getDailyDetails().get(0).getIsSoldOut());

        // Tạo 1 phòng bảo trì -> occupied = 1
        roomRepository.save(Room.builder()
                .roomNumber("MC_" + (System.currentTimeMillis() % 10000000))
                .roomType(testRoomType)
                .status(RoomStatus.MAINTENANCE)
                .build());

        // Tạo 1 booking CONFIRMED ở ngày d2 -> d4 (đêm d2, d3) -> tại ngày d2 occupied = 1 booking + 1 bảo trì = 2 = allocatedRooms
        bookingRepository.save(Booking.builder()
                .guest(testGuest)
                .roomType(testRoomType)
                .checkInDate(d2)
                .checkOutDate(d4)
                .status(BookingStatus.CONFIRMED)
                .expectedPrice(BigDecimal.valueOf(1000000))
                .build());

        // Trường hợp 2: Khách kiểm tra chỉ ở đêm d1 (check-in d1, check-out d2):
        // Tại d1: 0 booking + 1 bảo trì = 1 occupied -> Còn lại 2 - 1 = 1 phòng -> CÒN PHÒNG!
        plant.stay.dto.response.ChannelAvailabilityCheckResponse check2 = channelCalendarSyncService.checkAvailability(
                channel.getId(), testRoomType.getId(), null, d1, d2);
        assertTrue(check2.getIsAvailable());
        assertEquals(1, check2.getAvailableRooms());

        // Trường hợp 3: Khách kiểm tra từ d1 đến d3 (2 đêm: d1, d2):
        // Tại d2 đã bị chiếm hết 2 phòng -> HẾT PHÒNG!
        plant.stay.dto.response.ChannelAvailabilityCheckResponse check3 = channelCalendarSyncService.checkAvailability(
                channel.getId(), testRoomType.getId(), null, d1, d3);
        assertFalse(check3.getIsAvailable(), "Phải báo hết phòng vì ngày d2 đã bị chiếm hết phòng");
        assertEquals("SOLD_OUT", check3.getStatus());
        assertEquals(0, check3.getAvailableRooms());
        assertTrue(check3.getMessage().contains("ĐÃ HẾT PHÒNG"));

        // Kiểm tra chi tiết từng ngày
        assertEquals(2, check3.getDailyDetails().size());
        assertFalse(check3.getDailyDetails().get(0).getIsSoldOut()); // d1 còn 1 phòng
        assertTrue(check3.getDailyDetails().get(1).getIsSoldOut());  // d2 hết phòng
    }

    @Test
    @DisplayName("Kiểm tra ngày nhận trả không hợp lệ: checkOut trước hoặc bằng checkIn ném IllegalArgumentException")
    void testCheckAvailabilityInvalidDateRange() {
        ChannelRequest req = ChannelRequest.builder()
                .name("Kênh Date Validation")
                .channelCode("AIRBNB")
                .roomTypeId(testRoomType.getId())
                .allocatedRooms(1)
                .isActive(true)
                .build();
        ChannelResponse channel = channelCalendarSyncService.createChannel(req, testOwner);

        LocalDate d1 = LocalDate.now().plusDays(5);

        // checkIn == checkOut
        assertThrows(IllegalArgumentException.class, () -> {
            channelCalendarSyncService.checkAvailability(channel.getId(), testRoomType.getId(), null, d1, d1);
        });

        // checkOut trước checkIn
        assertThrows(IllegalArgumentException.class, () -> {
            channelCalendarSyncService.checkAvailability(channel.getId(), testRoomType.getId(), null, d1, d1.minusDays(1));
        });
    }
}
