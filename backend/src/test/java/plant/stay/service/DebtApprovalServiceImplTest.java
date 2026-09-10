package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import plant.stay.dto.request.DebtApprovalCreateRequest;
import plant.stay.model.Booking;
import plant.stay.model.BookingStatus;
import plant.stay.model.DebtApprovalRequest;
import plant.stay.model.Guest;
import plant.stay.model.Invoice;
import plant.stay.model.InvoiceStatus;
import plant.stay.model.Payment;
import plant.stay.model.Room;
import plant.stay.model.RoomStatus;
import plant.stay.model.User;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.DebtApprovalRepository;
import plant.stay.repository.InvoiceRepository;
import plant.stay.repository.PaymentRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.service.impl.DebtApprovalServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DebtApprovalServiceImplTest {

    @Mock private DebtApprovalRepository debtApprovalRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private AuditLogService auditLogService;

    private DebtApprovalService debtApprovalService;
    private Booking booking;
    private Invoice invoice;

    @BeforeEach
    void setUp() {
        debtApprovalService = new DebtApprovalServiceImpl(
                debtApprovalRepository, bookingRepository, invoiceRepository,
                paymentRepository, roomRepository, auditLogService);
        Guest guest = Guest.builder().id(1L).name("Khách có hồ sơ").phone("0900000000").build();
        booking = Booking.builder().id(10L).guest(guest).status(BookingStatus.CHECKED_IN).build();
        invoice = Invoice.builder()
                .id(20L)
                .booking(booking)
                .totalAmount(new BigDecimal("1000000"))
                .status(InvoiceStatus.PENDING_PAYMENT)
                .build();
    }

    @Test
    @DisplayName("Lưu đúng số dư hóa đơn khi đề nghị trả phòng còn nợ")
    void requestDebtCheckoutStoresAuthoritativeInvoiceBalance() {
        stubInvoiceForRequest();
        stubOutstandingBalance();
        DebtApprovalCreateRequest request = requestWithAmount(new BigDecimal("750000"));

        debtApprovalService.requestDebtCheckout(request, User.builder().name("Lễ tân").build());

        ArgumentCaptor<DebtApprovalRequest> captor = ArgumentCaptor.forClass(DebtApprovalRequest.class);
        verify(debtApprovalRepository).save(captor.capture());
        assertEquals(0, new BigDecimal("750000").compareTo(captor.getValue().getDebtAmount()));
    }

    @Test
    @DisplayName("Từ chối đề nghị có số tiền khác số dư hóa đơn")
    void requestDebtCheckoutRejectsMismatchedDebtAmount() {
        stubInvoiceForRequest();
        when(paymentRepository.findByInvoiceId(invoice.getId()))
            .thenReturn(List.of(Payment.builder().amount(new BigDecimal("250000")).build()));
        DebtApprovalCreateRequest request = requestWithAmount(new BigDecimal("700000"));

        assertThrows(IllegalArgumentException.class,
                () -> debtApprovalService.requestDebtCheckout(request, User.builder().name("Lễ tân").build()));

        verify(debtApprovalRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không cho đề nghị trả phòng còn nợ khi hóa đơn chờ duyệt giảm giá")
    void requestDebtCheckoutRejectsPendingDiscountApproval() {
        stubInvoiceForRequest();
        invoice.setStatus(InvoiceStatus.PENDING_DISCOUNT_APPROVAL);

        assertThrows(IllegalArgumentException.class,
                () -> debtApprovalService.requestDebtCheckout(requestWithAmount(new BigDecimal("750000")), User.builder().name("Lễ tân").build()));

        verify(debtApprovalRepository, never()).save(any());
    }

    @Test
    @DisplayName("Phê duyệt nợ trả phòng, chuyển phòng cần dọn và giữ hóa đơn còn nợ")
    void approveDebtCheckoutChecksOutBookingAndKeepsInvoiceOutstanding() {
        Room room = Room.builder().id(30L).roomNumber("101").status(RoomStatus.OCCUPIED).build();
        booking.setRoom(room);
        DebtApprovalRequest approvalRequest = DebtApprovalRequest.builder()
                .id(40L)
                .booking(booking)
                .invoice(invoice)
                .guest(booking.getGuest())
                .debtAmount(new BigDecimal("750000"))
                .dueDate(LocalDate.now().plusDays(7))
                .reason("Khách công ty thanh toán sau")
                .build();
        when(debtApprovalRepository.findById(approvalRequest.getId())).thenReturn(Optional.of(approvalRequest));
        when(paymentRepository.findByInvoiceId(invoice.getId()))
                .thenReturn(List.of(Payment.builder().amount(new BigDecimal("250000")).build()));

        debtApprovalService.approveDebtCheckout(approvalRequest.getId(), User.builder().name("Chủ cơ sở").build());

        assertEquals(BookingStatus.CHECKED_OUT, booking.getStatus());
        assertEquals(RoomStatus.DIRTY, room.getStatus());
        assertEquals(InvoiceStatus.PENDING_PAYMENT, invoice.getStatus());
        assertEquals(plant.stay.model.DebtApprovalStatus.APPROVED, approvalRequest.getStatus());
        verify(roomRepository).save(room);
    }

    private DebtApprovalCreateRequest requestWithAmount(BigDecimal debtAmount) {
        DebtApprovalCreateRequest request = new DebtApprovalCreateRequest();
        request.setBookingId(booking.getId());
        request.setDebtAmount(debtAmount);
        request.setDueDate(LocalDate.now().plusDays(7));
        request.setReason("Khách công ty thanh toán sau");
        return request;
    }

    private void stubOutstandingBalance() {
        when(paymentRepository.findByInvoiceId(invoice.getId()))
                .thenReturn(List.of(Payment.builder().amount(new BigDecimal("250000")).build()));
        when(debtApprovalRepository.findFirstByBookingIdAndStatus(any(), any())).thenReturn(Optional.empty());
        when(debtApprovalRepository.save(any(DebtApprovalRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void stubInvoiceForRequest() {
        when(bookingRepository.findById(booking.getId())).thenReturn(Optional.of(booking));
        when(invoiceRepository.findInvoicesCoveringBooking(booking.getId())).thenReturn(List.of(invoice));
    }
}