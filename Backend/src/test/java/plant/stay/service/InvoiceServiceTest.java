package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.GroupInvoiceCreateRequest;
import plant.stay.dto.request.PaymentRequest;
import plant.stay.dto.response.GroupInvoiceResponse;
import plant.stay.dto.response.InvoiceResponse;
import plant.stay.dto.response.PaymentResponse;
import plant.stay.model.*;
import plant.stay.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class InvoiceServiceTest {

    @Autowired
    private InvoiceService invoiceService;

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
    private InvoiceRepository invoiceRepository;

    @Autowired
    private GroupBookingRepository groupBookingRepository;

    @Autowired
    private DepositRepository depositRepository;

    private User testUser;
    private Booking testBooking;

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

        Guest guest = guestRepository.save(Guest.builder()
                .name("Khách Hàng Test")
                .phone("0933445566")
                .idNumber("998877665544")
                .build());

        RoomType roomType = roomTypeRepository.findAll().stream().findFirst().orElseThrow();
        Room room = roomRepository.findAll().stream().findFirst().orElseThrow();

        testBooking = bookingRepository.save(Booking.builder()
                .guest(guest)
                .roomType(roomType)
                .room(room)
                .checkInDate(LocalDate.now())
                .checkOutDate(LocalDate.now().plusDays(2))
                .status(BookingStatus.CHECKED_IN)
                .expectedPrice(new BigDecimal("1000000"))
                .actualPrice(new BigDecimal("1000000"))
                .createdBy(testUser)
                .build());
    }

    @Test
    @DisplayName("Lập hóa đơn thành công khi khách đang ở phòng")
    void testCreateInvoiceSuccess() {
        InvoiceResponse response = invoiceService.createInvoice(testBooking.getId(), testUser);

        assertNotNull(response);
        assertEquals(InvoiceStatus.PENDING, response.getStatus());
        assertEquals(0, new BigDecimal("1000000").compareTo(response.getRoomAmount()));
        assertEquals(0, new BigDecimal("1000000").compareTo(response.getTotalAmount()));
    }

    @Test
    @DisplayName("Ghi nhận thanh toán và tự động cập nhật hóa đơn sang PAID khi thanh toán đủ 100%")
    void testAddPaymentFullAmount() {
        InvoiceResponse invoiceRes = invoiceService.createInvoice(testBooking.getId(), testUser);

        PaymentRequest paymentRequest = new PaymentRequest();
        paymentRequest.setAmount(new BigDecimal("1000000"));
        paymentRequest.setMethod(PaymentMethod.CASH);
        paymentRequest.setNote("Thanh toán tiền mặt tại quầy");

        PaymentResponse paymentRes = invoiceService.addPayment(invoiceRes.getId(), paymentRequest, testUser);

        assertNotNull(paymentRes);
        assertEquals(0, new BigDecimal("1000000").compareTo(paymentRes.getAmount()));

        // Hóa đơn cập nhật sang PAID
        Invoice updatedInvoice = invoiceRepository.findById(invoiceRes.getId()).orElseThrow();
        assertEquals(InvoiceStatus.PAID, updatedInvoice.getStatus());
    }

    @Test
    @DisplayName("Ghi nhận thanh toán bằng Thẻ POS (CREDIT_CARD)")
    void testAddPaymentWithCreditCard() {
        InvoiceResponse invoiceRes = invoiceService.createInvoice(testBooking.getId(), testUser);

        PaymentRequest paymentRequest = new PaymentRequest();
        paymentRequest.setAmount(new BigDecimal("500000"));
        paymentRequest.setMethod(PaymentMethod.CREDIT_CARD);
        paymentRequest.setNote("Quẹt thẻ POS");

        PaymentResponse paymentRes = invoiceService.addPayment(invoiceRes.getId(), paymentRequest, testUser);

        assertNotNull(paymentRes);
        assertEquals(0, new BigDecimal("500000").compareTo(paymentRes.getAmount()));
        assertEquals(PaymentMethod.CREDIT_CARD, paymentRes.getMethod());
    }

    @Test
    @DisplayName("Lập một hóa đơn gộp cho đoàn cộng đúng tiền của mọi phòng")
    void createsCombinedInvoiceForCheckedInGroup() {
        GroupBooking groupBooking = createCheckedInGroup();
        GroupInvoiceCreateRequest request = groupInvoiceRequest(InvoiceMode.COMBINED);

        GroupInvoiceResponse response = invoiceService.createGroupInvoices(groupBooking.getId(), request, testUser);

        assertEquals(InvoiceMode.COMBINED, response.getMode());
        assertEquals(1, response.getInvoices().size());
        assertEquals(0, new BigDecimal("2400000").compareTo(response.getRoomAmount()));
        assertEquals(0, new BigDecimal("2400000").compareTo(response.getTotalAmount()));
        assertEquals(1, invoiceRepository.findByGroupBookingIdOrderByIdAsc(groupBooking.getId()).size());
    }

    @Test
    @DisplayName("Lập hóa đơn gộp cho đoàn có thu cọc chỉ cấn trừ đúng số tiền cọc (không bị nhân đôi)")
    void combinedInvoiceAppliesGroupDepositExactlyOnce() {
        GroupBooking groupBooking = createCheckedInGroup();
        // Thu cọc đoàn 720.000 đ
        depositRepository.save(Deposit.builder()
                .groupBooking(groupBooking)
                .requiredAmount(new BigDecimal("720000"))
                .collectedAmount(new BigDecimal("720000"))
                .status(DepositStatus.COLLECTED)
                .paymentMethod(PaymentMethod.CASH)
                .collectedAt(java.time.LocalDateTime.now())
                .collectedBy(testUser)
                .build());

        GroupInvoiceResponse response = invoiceService.createGroupInvoices(
                groupBooking.getId(), groupInvoiceRequest(InvoiceMode.COMBINED), testUser);

        assertEquals(0, new BigDecimal("2400000").compareTo(response.getTotalAmount()));
        assertEquals(0, new BigDecimal("720000").compareTo(response.getPaidAmount()));
        assertEquals(0, new BigDecimal("1680000").compareTo(response.getOutstandingAmount()));
    }

    @Test
    @DisplayName("Lập hóa đơn tách tạo một invoice mỗi phòng và tổng tiền không đổi")
    void createsSeparateInvoicesForCheckedInGroup() {
        GroupBooking groupBooking = createCheckedInGroup();
        GroupInvoiceCreateRequest request = groupInvoiceRequest(InvoiceMode.SEPARATE);

        GroupInvoiceResponse response = invoiceService.createGroupInvoices(groupBooking.getId(), request, testUser);

        assertEquals(InvoiceMode.SEPARATE, response.getMode());
        assertEquals(2, response.getInvoices().size());
        assertEquals(0, new BigDecimal("2400000").compareTo(response.getTotalAmount()));
        assertTrue(response.getInvoices().stream().allMatch(invoice -> invoice.getMode() == InvoiceMode.SEPARATE));
    }

    @Test
    @DisplayName("Không lập hóa đơn đoàn nếu còn phòng chưa nhận")
    void rejectsGroupInvoiceWhenAnyRoomIsNotCheckedIn() {
        GroupBooking groupBooking = createCheckedInGroup();
        Booking notCheckedIn = bookingRepository.findByGroupBookingId(groupBooking.getId()).get(1);
        notCheckedIn.setStatus(BookingStatus.CONFIRMED);
        bookingRepository.save(notCheckedIn);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> invoiceService.createGroupInvoices(groupBooking.getId(), groupInvoiceRequest(InvoiceMode.COMBINED), testUser));

        assertTrue(exception.getMessage().contains("tất cả phòng đều đã nhận phòng (đang ở)"));
        assertTrue(invoiceRepository.findByGroupBookingIdOrderByIdAsc(groupBooking.getId()).isEmpty());
    }

    private GroupInvoiceCreateRequest groupInvoiceRequest(InvoiceMode mode) {
        GroupInvoiceCreateRequest request = new GroupInvoiceCreateRequest();
        request.setMode(mode);
        request.setNote("Hóa đơn đoàn kiểm thử");
        return request;
    }

    private GroupBooking createCheckedInGroup() {
        GroupBooking groupBooking = new GroupBooking();
        groupBooking.setRepresentativeGuest(testBooking.getGuest());
        groupBooking.setCheckInDate(LocalDate.now());
        groupBooking.setCheckOutDate(LocalDate.now().plusDays(2));
        groupBooking.setCreatedBy(testUser);
        groupBooking = groupBookingRepository.save(groupBooking);

        RoomType roomType = testBooking.getRoomType();
        Room firstRoom = testBooking.getRoom();
        Room secondRoom = roomRepository.findAll().stream()
                .filter(room -> !room.getId().equals(firstRoom.getId()))
                .findFirst()
                .orElseGet(() -> roomRepository.save(Room.builder()
                        .roomNumber("GROUP-INV-" + System.nanoTime())
                        .roomType(roomType)
                        .floor("2")
                        .status(RoomStatus.OCCUPIED)
                        .build()));
        Guest secondGuest = guestRepository.save(Guest.builder()
                .name("Khách đoàn thứ hai")
                .phone("091" + System.nanoTime())
                .idNumber("ID" + System.nanoTime())
                .build());
        bookingRepository.save(Booking.builder()
                .groupBooking(groupBooking)
                .guest(testBooking.getGuest())
                .roomType(roomType)
                .room(firstRoom)
                .checkInDate(LocalDate.now())
                .checkOutDate(LocalDate.now().plusDays(2))
                .status(BookingStatus.CHECKED_IN)
                .expectedPrice(new BigDecimal("1000000"))
                .actualPrice(new BigDecimal("1000000"))
                .createdBy(testUser)
                .build());
        bookingRepository.save(Booking.builder()
                .groupBooking(groupBooking)
                .guest(secondGuest)
                .roomType(secondRoom.getRoomType())
                .room(secondRoom)
                .checkInDate(LocalDate.now())
                .checkOutDate(LocalDate.now().plusDays(2))
                .status(BookingStatus.CHECKED_IN)
                .expectedPrice(new BigDecimal("1400000"))
                .actualPrice(new BigDecimal("1400000"))
                .createdBy(testUser)
                .build());
        return groupBooking;
    }
}
