package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.InvoiceCancelRequest;
import plant.stay.dto.request.PaymentRequest;
import plant.stay.dto.response.InvoiceResponse;
import plant.stay.model.*;
import plant.stay.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class InvoiceCancelDraftTest {

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
    private DepositRepository depositRepository;

    private User receptionistUser;
    private Booking testBooking;

    @BeforeEach
    void setUp() {
        receptionistUser = userRepository.findByAccount("letan_cancel_test")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Lễ Tân Kiểm Thử")
                        .account("letan_cancel_test")
                        .password("pass123")
                        .role(Role.RECEPTIONIST)
                        .phone("0912345678")
                        .build()));

        Guest guest = guestRepository.save(Guest.builder()
                .name("Nguyễn Văn Hủy")
                .phone("0988776655")
                .idNumber("123456789012")
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
                .expectedPrice(new BigDecimal("800000.00"))
                .actualPrice(new BigDecimal("800000.00"))
                .createdBy(receptionistUser)
                .build());
    }

    @Test
    @DisplayName("Kịch bản 1: Hủy thành công hóa đơn nháp (PENDING) kèm lý do hợp lệ")
    void testCancelDraftInvoiceSuccess() {
        InvoiceResponse created = invoiceService.createInvoice(testBooking.getId(), receptionistUser);
        assertEquals(InvoiceStatus.PENDING, created.getStatus());

        InvoiceCancelRequest cancelReq = InvoiceCancelRequest.builder()
                .reason("Lập nhầm dịch vụ phụ thu, cần tạo lại hóa đơn chính xác")
                .build();

        InvoiceResponse cancelled = invoiceService.cancelDraftInvoice(created.getId(), cancelReq, receptionistUser);

        assertNotNull(cancelled);
        assertEquals(InvoiceStatus.CANCELLED, cancelled.getStatus());
        assertEquals("Lập nhầm dịch vụ phụ thu, cần tạo lại hóa đơn chính xác", cancelled.getCancelReason());
        assertEquals("Lễ Tân Kiểm Thử", cancelled.getCancelledByName());
        assertNotNull(cancelled.getCancelledAt());

        // Kiểm tra sau khi hủy, getByBooking không trả về hóa đơn đã hủy
        InvoiceResponse activeInv = invoiceService.getByBooking(testBooking.getId());
        assertNull(activeInv);

        // Kiểm tra có thể lập lại hóa đơn mới sau khi hóa đơn nháp cũ đã bị hủy
        InvoiceResponse reCreated = invoiceService.createInvoice(testBooking.getId(), receptionistUser);
        assertNotNull(reCreated);
        assertEquals(InvoiceStatus.PENDING, reCreated.getStatus());
        assertNotEquals(created.getId(), reCreated.getId());
    }

    @Test
    @DisplayName("Kịch bản 2: Bắt buộc phải có lý do hủy (ném lỗi nếu để trống hoặc quá ngắn)")
    void testCancelDraftInvoiceRequiresReason() {
        InvoiceResponse created = invoiceService.createInvoice(testBooking.getId(), receptionistUser);

        // Lý do null
        assertThrows(IllegalArgumentException.class, () ->
                invoiceService.cancelDraftInvoice(created.getId(), new InvoiceCancelRequest(null), receptionistUser)
        );

        // Lý do rỗng
        assertThrows(IllegalArgumentException.class, () ->
                invoiceService.cancelDraftInvoice(created.getId(), new InvoiceCancelRequest("   "), receptionistUser)
        );

        // Lý do quá ngắn (< 3 ký tự)
        assertThrows(IllegalArgumentException.class, () ->
                invoiceService.cancelDraftInvoice(created.getId(), new InvoiceCancelRequest("ab"), receptionistUser)
        );
    }

    @Test
    @DisplayName("Kịch bản 3: Không cho phép hủy hóa đơn đã thanh toán (PAID)")
    void testCannotCancelPaidInvoice() {
        InvoiceResponse created = invoiceService.createInvoice(testBooking.getId(), receptionistUser);

        // Thanh toán đủ toàn bộ hóa đơn
        PaymentRequest payReq = new PaymentRequest();
        payReq.setAmount(created.getTotalAmount());
        payReq.setMethod(PaymentMethod.CASH);
        payReq.setNote("Khách thanh toán đủ tiền mặt");
        invoiceService.addPayment(created.getId(), payReq, receptionistUser);

        InvoiceResponse paidInv = invoiceService.getById(created.getId());
        assertEquals(InvoiceStatus.PAID, paidInv.getStatus());

        // Thử hủy hóa đơn đã thanh toán -> ném lỗi
        InvoiceCancelRequest cancelReq = InvoiceCancelRequest.builder()
                .reason("Muốn hủy hóa đơn đã thanh toán")
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                invoiceService.cancelDraftInvoice(created.getId(), cancelReq, receptionistUser)
        );
        assertTrue(ex.getMessage().contains("PAID") || ex.getMessage().contains("đã thanh toán"));
    }

    @Test
    @DisplayName("Kịch bản 4: Không cho phép hủy lại hóa đơn đã bị hủy (CANCELLED)")
    void testCannotCancelAlreadyCancelledInvoice() {
        InvoiceResponse created = invoiceService.createInvoice(testBooking.getId(), receptionistUser);

        InvoiceCancelRequest cancelReq = InvoiceCancelRequest.builder()
                .reason("Lý do hủy lần 1")
                .build();

        invoiceService.cancelDraftInvoice(created.getId(), cancelReq, receptionistUser);

        // Thử hủy lần 2
        InvoiceCancelRequest cancelReq2 = InvoiceCancelRequest.builder()
                .reason("Lý do hủy lần 2")
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                invoiceService.cancelDraftInvoice(created.getId(), cancelReq2, receptionistUser)
        );
    }

    @Test
    @DisplayName("Kịch bản 5: Khi hủy hóa đơn có khấu trừ cọc, cọc được bảo toàn cho hóa đơn mới")
    void testCancelDraftInvoicePreservesDeposit() {
        // Tạo cọc đã thu 300.000 đ
        Deposit deposit = Deposit.builder()
                .booking(testBooking)
                .requiredAmount(new BigDecimal("300000.00"))
                .collectedAmount(new BigDecimal("300000.00"))
                .status(DepositStatus.COLLECTED)
                .paymentMethod(PaymentMethod.CASH)
                .collectedBy(receptionistUser)
                .build();
        depositRepository.save(deposit);

        // Lập hóa đơn 1 -> tự động khấu trừ cọc 300k
        InvoiceResponse inv1 = invoiceService.createInvoice(testBooking.getId(), receptionistUser);
        assertEquals(InvoiceStatus.PENDING, inv1.getStatus());

        // Hủy hóa đơn 1
        InvoiceCancelRequest cancelReq = InvoiceCancelRequest.builder()
                .reason("Lập nhầm thông tin cần tạo lại")
                .build();
        invoiceService.cancelDraftInvoice(inv1.getId(), cancelReq, receptionistUser);

        // Lập hóa đơn 2 -> cọc 300k vẫn tiếp tục được khấu trừ thành công
        InvoiceResponse inv2 = invoiceService.createInvoice(testBooking.getId(), receptionistUser);
        assertNotNull(inv2);
        assertEquals(InvoiceStatus.PENDING, inv2.getStatus());

        var payments = invoiceService.getPayments(inv2.getId());
        assertEquals(1, payments.size());
        assertEquals(0, new BigDecimal("300000.00").compareTo(payments.get(0).getAmount()));
    }
}
