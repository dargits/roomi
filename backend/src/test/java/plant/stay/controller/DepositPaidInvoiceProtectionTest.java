package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import plant.stay.dto.request.DepositProcessRequest;
import plant.stay.dto.request.DepositRequest;
import plant.stay.dto.response.DepositResponse;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.util.AuthUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

public class DepositPaidInvoiceProtectionTest {

    private DepositRepository depositRepo;
    private DepositPolicyRepository policyRepo;
    private BookingRepository bookingRepo;
    private CancellationPolicyRepository cancellationPolicyRepo;
    private InvoiceRepository invoiceRepo;
    private PaymentRepository paymentRepo;
    private AuditLogService auditLogService;
    private AuthUtil authUtil;

    private DepositController controller;
    private HttpServletRequest request;
    private User staffUser;
    private Booking activeBooking;
    private Deposit collectedDeposit;

    @BeforeEach
    public void setup() {
        depositRepo = Mockito.mock(DepositRepository.class);
        policyRepo = Mockito.mock(DepositPolicyRepository.class);
        bookingRepo = Mockito.mock(BookingRepository.class);
        cancellationPolicyRepo = Mockito.mock(CancellationPolicyRepository.class);
        invoiceRepo = Mockito.mock(InvoiceRepository.class);
        paymentRepo = Mockito.mock(PaymentRepository.class);
        auditLogService = Mockito.mock(AuditLogService.class);
        authUtil = Mockito.mock(AuthUtil.class);
        request = Mockito.mock(HttpServletRequest.class);

        controller = new DepositController(
                depositRepo, policyRepo, bookingRepo, cancellationPolicyRepo,
                invoiceRepo, paymentRepo, auditLogService, authUtil
        );

        staffUser = User.builder()
                .id(1L)
                .account("receptionist")
                .role(Role.RECEPTIONIST)
                .build();
        when(authUtil.getUserFromRequest(request)).thenReturn(staffUser);

        RoomType roomType = RoomType.builder().id(1L).name("Phòng Tiêu Chuẩn").build();
        activeBooking = Booking.builder()
                .id(100L)
                .status(BookingStatus.CONFIRMED)
                .roomType(roomType)
                .checkInDate(LocalDate.now().plusDays(2))
                .checkOutDate(LocalDate.now().plusDays(4))
                .expectedPrice(BigDecimal.valueOf(2000000))
                .build();
        when(bookingRepo.findById(100L)).thenReturn(Optional.of(activeBooking));

        collectedDeposit = Deposit.builder()
                .id(10L)
                .booking(activeBooking)
                .requiredAmount(BigDecimal.valueOf(500000))
                .collectedAmount(BigDecimal.valueOf(500000))
                .status(DepositStatus.COLLECTED)
                .build();
        when(depositRepo.findFirstByBookingIdOrderByCreatedAtDesc(100L)).thenReturn(Optional.of(collectedDeposit));
    }

    @Test
    @DisplayName("Chặn thu cọc: Khi hóa đơn của đặt phòng đã thanh toán (PAID) -> Ném ngoại lệ và không cho phép thu cọc")
    public void testRecordDeposit_WhenInvoiceIsPaid_ShouldThrowException() {
        Invoice paidInvoice = Invoice.builder()
                .id(50L)
                .booking(activeBooking)
                .status(InvoiceStatus.PAID)
                .totalAmount(BigDecimal.valueOf(2000000))
                .build();
        when(invoiceRepo.findInvoicesCoveringBooking(100L)).thenReturn(List.of(paidInvoice));

        DepositRequest req = new DepositRequest();
        req.setAmount(BigDecimal.valueOf(500000));
        req.setPaymentMethod(PaymentMethod.CASH);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                controller.recordDeposit(100L, req, request)
        );
        assertTrue(ex.getMessage().contains("đã được thanh toán hoàn tất (PAID)"));
        assertTrue(ex.getMessage().contains("Không thể thu thêm tiền cọc"));
    }

    @Test
    @DisplayName("Cho phép thu cọc: Khi hóa đơn chưa thanh toán (PENDING hoặc chưa có) -> Thu cọc bình thường")
    public void testRecordDeposit_WhenInvoiceNotPaid_ShouldAllow() {
        when(invoiceRepo.findInvoicesCoveringBooking(100L)).thenReturn(Collections.emptyList());
        when(depositRepo.findByBookingIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());
        when(depositRepo.save(any(Deposit.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DepositRequest req = new DepositRequest();
        req.setAmount(BigDecimal.valueOf(500000));
        req.setPaymentMethod(PaymentMethod.CASH);

        ResponseEntity<DepositResponse> response = controller.recordDeposit(100L, req, request);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(BigDecimal.valueOf(500000), response.getBody().getCollectedAmount());
    }

    @Test
    @DisplayName("Chặn hoàn cọc: Khi hóa đơn của đặt phòng đã thanh toán (PAID) -> Ném ngoại lệ và chặn hoàn tiền cọc")
    public void testRefundDeposit_WhenInvoiceIsPaid_ShouldThrowException() {
        Invoice paidInvoice = Invoice.builder()
                .id(50L)
                .booking(activeBooking)
                .status(InvoiceStatus.PAID)
                .totalAmount(BigDecimal.valueOf(2000000))
                .build();
        when(invoiceRepo.findInvoicesCoveringBooking(100L)).thenReturn(List.of(paidInvoice));

        DepositProcessRequest req = new DepositProcessRequest();
        req.setReason("Khách hủy phòng");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                controller.refundDeposit(100L, req, request)
        );
        assertTrue(ex.getMessage().contains("đã được thanh toán hoàn tất (PAID)"));
        assertTrue(ex.getMessage().contains("Không thể hoàn tiền cọc"));
    }

    @Test
    @DisplayName("Chặn no-show cọc: Khi hóa đơn đã thanh toán (PAID) -> Chặn xử lý cọc no-show")
    public void testNoShowDeposit_WhenInvoiceIsPaid_ShouldThrowException() {
        Invoice paidInvoice = Invoice.builder()
                .id(50L)
                .booking(activeBooking)
                .status(InvoiceStatus.PAID)
                .totalAmount(BigDecimal.valueOf(2000000))
                .build();
        when(invoiceRepo.findInvoicesCoveringBooking(100L)).thenReturn(List.of(paidInvoice));

        DepositProcessRequest req = new DepositProcessRequest();
        req.setReason("Khách không đến");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                controller.noShowDeposit(100L, req, request)
        );
        assertTrue(ex.getMessage().contains("đã được thanh toán hoàn tất (PAID)"));
        assertTrue(ex.getMessage().contains("Không thể xử lý cọc sau khi đã quyết toán"));
    }

    @Test
    @DisplayName("Chặn thu cọc: Khi đặt phòng đang ở (CHECKED_IN) trở đi -> Ném ngoại lệ và không cho phép thu cọc")
    public void testRecordDeposit_WhenBookingIsCheckedInOrLater_ShouldThrowException() {
        for (BookingStatus st : List.of(BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED, BookingStatus.NO_SHOW)) {
            Booking booking = Booking.builder()
                    .id(200L)
                    .status(st)
                    .expectedPrice(BigDecimal.valueOf(1000000))
                    .build();
            when(bookingRepo.findById(200L)).thenReturn(Optional.of(booking));

            DepositRequest req = new DepositRequest();
            req.setAmount(BigDecimal.valueOf(300000));
            req.setPaymentMethod(PaymentMethod.CASH);

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    controller.recordDeposit(200L, req, request)
            );
            assertTrue(ex.getMessage().contains("Không thể thu cọc khi đặt phòng ở trạng thái"),
                    "Lỗi không chứa thông báo mong muốn khi trạng thái là " + st);
        }
    }
}
