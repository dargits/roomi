package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import plant.stay.dto.request.CashierShiftCloseRequest;
import plant.stay.exception.BusinessException;
import plant.stay.model.*;
import plant.stay.repository.CashierShiftClosingRepository;
import plant.stay.repository.CashierShiftRepository;
import plant.stay.repository.DebtApprovalRepository;
import plant.stay.repository.DepositRepository;
import plant.stay.repository.InvoiceRepository;
import plant.stay.repository.PaymentRepository;
import plant.stay.service.impl.CashierShiftServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CashierShiftServiceImplTest {

    @Mock private CashierShiftRepository shiftRepository;
    @Mock private CashierShiftClosingRepository closingRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private DepositRepository depositRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private DebtApprovalRepository debtApprovalRepository;
    @Mock private AuditLogService auditLogService;

    private CashierShiftServiceImpl cashierShiftService;
    private User receptionist;
    private CashierShift shift;

    @BeforeEach
    void setUp() {
        cashierShiftService = new CashierShiftServiceImpl(
                shiftRepository, closingRepository, paymentRepository, depositRepository,
                invoiceRepository, debtApprovalRepository, auditLogService);
        receptionist = User.builder().id(1L).name("Lễ tân").role(Role.RECEPTIONIST).build();
        shift = CashierShift.builder()
                .id(100L).openedBy(receptionist).openedAt(LocalDateTime.now().minusHours(2))
                .openingCash(BigDecimal.ZERO).status(CashierShiftStatus.OPEN).build();
        when(shiftRepository.findById(shift.getId())).thenReturn(Optional.of(shift));
        lenient().when(paymentRepository.findAll()).thenReturn(List.of());
        lenient().when(depositRepository.findAll()).thenReturn(List.of());
        lenient().when(shiftRepository.save(any(CashierShift.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(closingRepository.save(any(CashierShiftClosing.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("Không chặn chốt ca khi khách nợ đã được duyệt trả sau")
    void closeAllowsApprovedDebtCheckout() {
        Booking booking = Booking.builder().id(10L).status(BookingStatus.CHECKED_OUT)
                .checkedOutAt(LocalDateTime.now().minusMinutes(30)).build();
        Invoice invoice = Invoice.builder().id(20L).booking(booking).status(InvoiceStatus.PENDING_PAYMENT).build();
        when(invoiceRepository.findAll()).thenReturn(List.of(invoice));
        when(debtApprovalRepository.existsActiveApprovedDebtByBookingId(booking.getId())).thenReturn(true);

        CashierShiftCloseRequest request = new CashierShiftCloseRequest();
        request.setActualCash(BigDecimal.ZERO);

        assertDoesNotThrow(() -> cashierShiftService.close(shift.getId(), request, receptionist));
    }

    @Test
    @DisplayName("Vẫn chặn chốt ca khi hóa đơn trả phòng chưa tất toán và không có nợ được duyệt")
    void closeBlocksUnsettledInvoiceWithoutApprovedDebt() {
        Booking booking = Booking.builder().id(11L).status(BookingStatus.CHECKED_OUT)
                .checkedOutAt(LocalDateTime.now().minusMinutes(30)).build();
        Invoice invoice = Invoice.builder().id(21L).booking(booking).status(InvoiceStatus.PENDING_PAYMENT).build();
        when(invoiceRepository.findAll()).thenReturn(List.of(invoice));
        when(debtApprovalRepository.existsActiveApprovedDebtByBookingId(booking.getId())).thenReturn(false);

        CashierShiftCloseRequest request = new CashierShiftCloseRequest();
        request.setActualCash(BigDecimal.ZERO);

        assertThrows(BusinessException.class, () -> cashierShiftService.close(shift.getId(), request, receptionist));
    }

    @Test
    @DisplayName("Vẫn chặn chốt ca khi hóa đơn đang chờ duyệt giảm giá dù có nợ được duyệt")
    void closeBlocksPendingDiscountApprovalEvenWithApprovedDebt() {
        Booking booking = Booking.builder().id(12L).status(BookingStatus.CHECKED_OUT)
                .checkedOutAt(LocalDateTime.now().minusMinutes(30)).build();
        Invoice invoice = Invoice.builder().id(22L).booking(booking).status(InvoiceStatus.PENDING_DISCOUNT_APPROVAL).build();
        when(invoiceRepository.findAll()).thenReturn(List.of(invoice));

        CashierShiftCloseRequest request = new CashierShiftCloseRequest();
        request.setActualCash(BigDecimal.ZERO);

        assertThrows(BusinessException.class, () -> cashierShiftService.close(shift.getId(), request, receptionist));
    }
}
