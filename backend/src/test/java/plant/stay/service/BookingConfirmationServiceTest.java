package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.SendConfirmationRequest;
import plant.stay.dto.response.BookingConfirmationData;
import plant.stay.dto.response.BookingConfirmationLogResponse;
import plant.stay.dto.response.BookingResponse;
import plant.stay.model.*;
import plant.stay.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class BookingConfirmationServiceTest {

    @Autowired
    private BookingService bookingService;

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
    private DepositPolicyRepository depositPolicyRepository;

    @Autowired
    private CancellationPolicyRepository cancellationPolicyRepository;

    @Autowired
    private BookingConfirmationLogRepository bookingConfirmationLogRepository;

    private User staffUser;
    private Guest testGuest;
    private RoomType testRoomType;
    private Room testRoom;
    private Booking newBooking;

    @BeforeEach
    void setUp() {
        staffUser = userRepository.findByAccount("test_receptionist")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Lễ Tân Kiểm Thử")
                        .account("test_receptionist")
                        .password("password123")
                        .role(Role.RECEPTIONIST)
                        .phone("0988776655")
                        .build()));

        testGuest = guestRepository.save(Guest.builder()
                .name("Nguyễn Văn Khách")
                .phone("0912345678")
                .email("khachhang@example.com")
                .idNumber("001200001234")
                .build());

        testRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Phòng Deluxe Hướng Biển")
                .basePrice(new BigDecimal("1200000"))
                .standardCapacity(2)
                .maxCapacity(4)
                .build());

        testRoom = roomRepository.save(Room.builder()
                .roomNumber("DLX-301")
                .roomType(testRoomType)
                .status(RoomStatus.AVAILABLE)
                .build());

        LocalDate today = LocalDate.now().plusDays(2);
        newBooking = bookingRepository.save(Booking.builder()
                .guest(testGuest)
                .roomType(testRoomType)
                .room(testRoom)
                .checkInDate(today)
                .checkOutDate(today.plusDays(2))
                .status(BookingStatus.NEW)
                .expectedPrice(new BigDecimal("2400000"))
                .actualPrice(new BigDecimal("2400000"))
                .createdBy(staffUser)
                .build());
    }

    @Test
    @DisplayName("Xác nhận đặt phòng: chuyển từ NEW sang CONFIRMED thành công")
    void testConfirmBookingSuccess() {
        BookingResponse resp = bookingService.confirmBooking(newBooking.getId(), staffUser);
        assertNotNull(resp);
        assertEquals(BookingStatus.CONFIRMED, resp.getStatus());

        Booking reloaded = bookingRepository.findById(newBooking.getId()).orElseThrow();
        assertEquals(BookingStatus.CONFIRMED, reloaded.getStatus());
    }

    @Test
    @DisplayName("Xác nhận đặt phòng: cảnh báo khi khách thiếu SĐT và Email nhưng vẫn xác nhận được")
    void testConfirmBookingWithoutContactInfoStillSucceeds() {
        Guest guestNoContact = guestRepository.save(Guest.builder()
                .name("Khách Ẩn Danh")
                .phone(null)
                .email(null)
                .build());

        Booking bookingNoContact = bookingRepository.save(Booking.builder()
                .guest(guestNoContact)
                .roomType(testRoomType)
                .checkInDate(LocalDate.now().plusDays(5))
                .checkOutDate(LocalDate.now().plusDays(7))
                .status(BookingStatus.NEW)
                .expectedPrice(new BigDecimal("1800000"))
                .build());

        BookingResponse resp = bookingService.confirmBooking(bookingNoContact.getId(), staffUser);
        assertNotNull(resp);
        assertEquals(BookingStatus.CONFIRMED, resp.getStatus());
    }

    @Test
    @DisplayName("Sinh bản xác nhận đặt phòng: chứa đủ ngày, phòng, giá từng đêm, cọc và chính sách hủy")
    void testGetBookingConfirmationData() {
        // Cấu hình chính sách cọc và hủy
        depositPolicyRepository.save(DepositPolicy.builder()
                .roomType(testRoomType)
                .depositPercent(new BigDecimal("30"))
                .active(true)
                .build());

        cancellationPolicyRepository.save(CancellationPolicy.builder()
                .roomType(testRoomType)
                .freeCancelHours(48)
                .penaltyPercent(new BigDecimal("50"))
                .build());

        bookingService.confirmBooking(newBooking.getId(), staffUser);

        BookingConfirmationData data = bookingService.getBookingConfirmationData(newBooking.getId());
        assertNotNull(data);
        assertEquals(newBooking.getId(), data.getBookingId());
        assertEquals("Nguyễn Văn Khách", data.getGuestName());
        assertEquals("0912345678", data.getGuestPhone());
        assertEquals("khachhang@example.com", data.getGuestEmail());
        assertTrue(data.isHasContactInfo());
        assertTrue(data.isHasGuestEmail());
        assertTrue(data.isHasGuestPhone());

        // Kiểm tra phòng & thời gian
        assertEquals("Phòng Deluxe Hướng Biển", data.getRoomTypeName());
        assertEquals("DLX-301", data.getRoomNumber());
        assertEquals(2, data.getTotalNights());
        assertNotNull(data.getStandardCheckInTime());
        assertNotNull(data.getStandardCheckOutTime());

        // Kiểm tra chi tiết giá từng đêm
        assertNotNull(data.getNightlyDetails());
        assertFalse(data.getNightlyDetails().isEmpty());
        assertNotNull(data.getGrandTotalPrice());

        // Kiểm tra tiền cọc quy định
        assertNotNull(data.getRequiredDepositAmount());
        assertTrue(data.getRequiredDepositAmount().compareTo(BigDecimal.ZERO) > 0);

        // Kiểm tra tóm tắt chính sách hủy
        assertNotNull(data.getCancellationPolicySummary());
        assertTrue(data.getCancellationPolicySummary().contains("48 giờ"));

        // Kiểm tra nội dung tin nhắn soạn sẵn
        assertNotNull(data.getFormattedMessage());
        assertTrue(data.getFormattedMessage().contains("XÁC NHẬN ĐẶT PHÒNG"));
        assertTrue(data.getFormattedMessage().contains(data.getGuestName()));
        assertTrue(data.getFormattedMessage().contains("DLX-301"));
    }

    @Test
    @DisplayName("Gửi bản xác nhận qua kênh tin nhắn và ghi nhật ký")
    void testSendOrLogConfirmationMessagingApp() {
        bookingService.confirmBooking(newBooking.getId(), staffUser);

        SendConfirmationRequest req = SendConfirmationRequest.builder()
                .channel(ConfirmationChannel.MESSAGING_APP)
                .customPhone("0912345678")
                .note("Đã sao chép gửi qua Zalo cho khách")
                .build();

        BookingConfirmationLogResponse logResp = bookingService.sendOrLogConfirmation(newBooking.getId(), req, staffUser);
        assertNotNull(logResp);
        assertEquals(ConfirmationChannel.MESSAGING_APP, logResp.getChannel());
        assertEquals("SUCCESS", logResp.getStatus());
        assertEquals("0912345678", logResp.getRecipient());
        assertEquals(staffUser.getName(), logResp.getSentByName());

        // Kiểm tra lịch sử gửi
        List<BookingConfirmationLogResponse> logs = bookingService.getConfirmationLogs(newBooking.getId());
        assertEquals(1, logs.size());
        assertEquals("Đã sao chép gửi qua Zalo cho khách", logs.get(0).getNote());
    }

    @Test
    @DisplayName("Gửi bản xác nhận qua kênh In/Xuất file và ghi nhật ký")
    void testSendOrLogConfirmationPrintExport() {
        bookingService.confirmBooking(newBooking.getId(), staffUser);

        SendConfirmationRequest req = SendConfirmationRequest.builder()
                .channel(ConfirmationChannel.PRINT_EXPORT)
                .note("Đã in bản xác nhận gửi trực tiếp cho khách tại quầy")
                .build();

        BookingConfirmationLogResponse logResp = bookingService.sendOrLogConfirmation(newBooking.getId(), req, staffUser);
        assertNotNull(logResp);
        assertEquals(ConfirmationChannel.PRINT_EXPORT, logResp.getChannel());
        assertEquals("SUCCESS", logResp.getStatus());

        List<BookingConfirmationLogResponse> logs = bookingService.getConfirmationLogs(newBooking.getId());
        assertFalse(logs.isEmpty());
    }

    @Test
    @DisplayName("Gửi bản xác nhận qua Email khi khách chưa có email phải báo lỗi rõ ràng")
    void testSendConfirmationEmailWithoutEmailThrowsException() {
        Guest guestNoEmail = guestRepository.save(Guest.builder()
                .name("Khách Không Có Email")
                .phone("0909090909")
                .email(null)
                .build());

        Booking bookingNoEmail = bookingRepository.save(Booking.builder()
                .guest(guestNoEmail)
                .roomType(testRoomType)
                .checkInDate(LocalDate.now().plusDays(1))
                .checkOutDate(LocalDate.now().plusDays(3))
                .status(BookingStatus.CONFIRMED)
                .expectedPrice(new BigDecimal("1500000"))
                .build());

        SendConfirmationRequest req = SendConfirmationRequest.builder()
                .channel(ConfirmationChannel.EMAIL)
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                bookingService.sendOrLogConfirmation(bookingNoEmail.getId(), req, staffUser)
        );
    }

    @Test
    @DisplayName("Cơ chế chống spam: Gửi email liên tục trong vòng 60 giây bị chặn bởi Cooldown")
    void testSendEmailCooldownThrowsException() {
        bookingService.confirmBooking(newBooking.getId(), staffUser);

        SendConfirmationRequest req = SendConfirmationRequest.builder()
                .channel(ConfirmationChannel.EMAIL)
                .customEmail("khachhang@example.com")
                .note("Gửi lần 1")
                .build();

        // Lần 1: Thành công
        BookingConfirmationLogResponse firstSend = bookingService.sendOrLogConfirmation(newBooking.getId(), req, staffUser);
        assertNotNull(firstSend);

        // Lần 2 ngay lập tức (< 60s): Phải ném ngoại lệ thông báo cooldown
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                bookingService.sendOrLogConfirmation(newBooking.getId(), req, staffUser)
        );
        assertTrue(ex.getMessage().contains("Email xác nhận vừa được gửi cách đây"));
        assertTrue(ex.getMessage().contains("Vui lòng đợi thêm"));
    }

    @Test
    @DisplayName("Cơ chế chống spam: Gửi email quá 5 lần trong một ngày bị chặn bởi Quota")
    void testSendEmailQuotaExceededThrowsException() {
        bookingService.confirmBooking(newBooking.getId(), staffUser);

        // Giả lập 5 lượt gửi trong ngày hôm nay (cách đây 2, 3, 4, 5, 6 tiếng)
        for (int i = 5; i >= 1; i--) {
            bookingConfirmationLogRepository.save(BookingConfirmationLog.builder()
                    .booking(newBooking)
                    .channel(ConfirmationChannel.EMAIL)
                    .recipient("khachhang@example.com")
                    .sentBy(staffUser)
                    .status("SUCCESS")
                    .note("Gửi lần " + i)
                    .sentAt(java.time.LocalDateTime.now().minusHours(i))
                    .build());
        }

        // Kiểm tra DTO trả về đã thống kê đủ 5 lần
        BookingConfirmationData data = bookingService.getBookingConfirmationData(newBooking.getId());
        assertEquals(5, data.getEmailSendCountToday());
        assertEquals(5, data.getMaxEmailSendQuota());

        // Lần thứ 6: Phải ném ngoại lệ Quota
        SendConfirmationRequest req = SendConfirmationRequest.builder()
                .channel(ConfirmationChannel.EMAIL)
                .customEmail("khachhang@example.com")
                .note("Cố gửi lần 6")
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                bookingService.sendOrLogConfirmation(newBooking.getId(), req, staffUser)
        );
        assertTrue(ex.getMessage().contains("Đã đạt giới hạn tối đa 5 lần"));
    }
}
