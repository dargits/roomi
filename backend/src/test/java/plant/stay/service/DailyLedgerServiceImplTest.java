package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import plant.stay.dto.request.CashierShiftReopenRequest;
import plant.stay.dto.request.DailyLedgerReopenRequest;
import plant.stay.dto.response.DailyLedgerResponse;
import plant.stay.exception.BusinessException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.impl.CashierShiftServiceImpl;
import plant.stay.service.impl.DailyLedgerServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DailyLedgerServiceImplTest {

    @Mock private DailyLedgerRepository ledgerRepository;
    @Mock private CashierShiftRepository shiftRepository;
    @Mock private CashierShiftClosingRepository closingRepository;
    @Mock private AuditLogService auditLogService;

    // For testing shift reopen blocking
    @Mock private PaymentRepository paymentRepository;
    @Mock private DepositRepository depositRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private DebtApprovalRepository debtApprovalRepository;

    private DailyLedgerServiceImpl dailyLedgerService;
    private CashierShiftServiceImpl cashierShiftService;

    private User owner;
    private User accountant;
    private User receptionist;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        dailyLedgerService = new DailyLedgerServiceImpl(
                ledgerRepository, shiftRepository, closingRepository, auditLogService);
        cashierShiftService = new CashierShiftServiceImpl(
                shiftRepository, closingRepository, paymentRepository, depositRepository,
                invoiceRepository, debtApprovalRepository, ledgerRepository, auditLogService);

        owner = User.builder().id(1L).name("Chủ cơ sở").role(Role.OWNER).build();
        accountant = User.builder().id(2L).name("Kế toán").role(Role.ACCOUNTANT).build();
        receptionist = User.builder().id(3L).name("Lễ tân").role(Role.RECEPTIONIST).build();
        today = LocalDate.now();
    }

    @Test
    @DisplayName("preview tính đúng tổng hợp thu chi từ các phiếu chốt ca trong ngày")
    void previewCalculatesTotalsCorrectly() {
        CashierShift shift = CashierShift.builder().id(10L).openedBy(receptionist).openedAt(today.atTime(8, 0)).build();
        CashierShiftClosing closing = CashierShiftClosing.builder()
                .id(100L)
                .shift(shift)
                .closedBy(receptionist)
                .closedAt(today.atTime(16, 0))
                .invoiceCash(new BigDecimal("1000000"))
                .invoiceTransfer(new BigDecimal("500000"))
                .depositCash(new BigDecimal("200000"))
                .refundCash(new BigDecimal("50000"))
                .expectedCash(new BigDecimal("1150000"))
                .actualCash(new BigDecimal("1150000"))
                .discrepancy(BigDecimal.ZERO)
                .build();

        when(closingRepository.findByClosedAtBetweenOrderByClosedAtDesc(any(), any())).thenReturn(List.of(closing));
        when(shiftRepository.findByStatusAndOpenedAtBefore(eq(CashierShiftStatus.OPEN), any())).thenReturn(List.of());
        when(ledgerRepository.findByDate(today)).thenReturn(Optional.empty());

        DailyLedgerResponse res = dailyLedgerService.preview(today, accountant);

        assertNotNull(res);
        assertEquals(DailyLedgerStatus.OPEN, res.getStatus());
        assertEquals(new BigDecimal("1000000"), res.getTotalInvoiceCash());
        assertEquals(new BigDecimal("500000"), res.getTotalInvoiceTransfer());
        assertEquals(new BigDecimal("200000"), res.getTotalDepositCash());
        assertEquals(new BigDecimal("50000"), res.getTotalRefundCash());
        assertEquals(new BigDecimal("1150000"), res.getTotalExpectedCash());
        assertEquals(BigDecimal.ZERO, res.getTotalDiscrepancy());
        assertEquals(1, res.getShifts().size());
        assertEquals(0, res.getOpenShifts().size());
    }

    @Test
    @DisplayName("Chốt sổ ngày bị từ chối nếu còn ca làm việc chưa chốt và nêu rõ tên ca")
    void closeBlocksWhenOpenShiftsExist() {
        CashierShift openShift = CashierShift.builder()
                .id(99L)
                .openedBy(receptionist)
                .openedAt(today.atTime(14, 0))
                .status(CashierShiftStatus.OPEN)
                .build();

        when(ledgerRepository.findByDate(today)).thenReturn(Optional.empty());
        when(shiftRepository.findByStatusAndOpenedAtBefore(eq(CashierShiftStatus.OPEN), any()))
                .thenReturn(List.of(openShift));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                dailyLedgerService.close(today, accountant));

        assertTrue(ex.getMessage().contains("Chưa thể chốt sổ"));
        assertTrue(ex.getMessage().contains("Ca #99"));
        assertTrue(ex.getMessage().contains("Lễ tân"));
    }

    @Test
    @DisplayName("Chốt sổ ngày thành công khi tất cả ca đã chốt")
    void closeSucceedsWhenAllShiftsClosed() {
        when(ledgerRepository.findByDate(today)).thenReturn(Optional.empty());
        when(shiftRepository.findByStatusAndOpenedAtBefore(eq(CashierShiftStatus.OPEN), any())).thenReturn(List.of());
        when(closingRepository.findByClosedAtBetweenOrderByClosedAtDesc(any(), any())).thenReturn(List.of());
        when(ledgerRepository.save(any(DailyLedger.class))).thenAnswer(inv -> {
            DailyLedger l = inv.getArgument(0);
            l.setId(1L);
            return l;
        });

        DailyLedgerResponse res = dailyLedgerService.close(today, accountant);

        assertNotNull(res);
        verify(ledgerRepository).save(argThat(l ->
                l.getStatus() == DailyLedgerStatus.CLOSED &&
                l.getClosedBy().equals(accountant)
        ));
        verify(auditLogService).log(eq("DailyLedger"), any(), eq("DAILY_LEDGER_CLOSED"), eq(accountant), any());
    }

    @Test
    @DisplayName("Chỉ Chủ cơ sở (OWNER) mới có quyền mở lại sổ ngày kèm lý do")
    void reopenRequiresOwnerAndReason() {
        DailyLedgerReopenRequest request = new DailyLedgerReopenRequest();
        request.setReason("Đối soát lại hóa đơn bị sót ca tối");

        // Khi Kế toán thử mở lại -> Ném ngoại lệ
        BusinessException exAccountant = assertThrows(BusinessException.class, () ->
                dailyLedgerService.reopen(today, request, accountant));
        assertTrue(exAccountant.getMessage().contains("Chỉ Chủ cơ sở"));

        // Khi Chủ cơ sở mở lại sổ đã CLOSED
        DailyLedger closedLedger = DailyLedger.builder()
                .id(1L)
                .date(today)
                .status(DailyLedgerStatus.CLOSED)
                .closedBy(accountant)
                .closedAt(LocalDateTime.now().minusHours(1))
                .build();
        when(ledgerRepository.findByDate(today)).thenReturn(Optional.of(closedLedger));
        when(closingRepository.findByClosedAtBetweenOrderByClosedAtDesc(any(), any())).thenReturn(List.of());
        when(shiftRepository.findByStatusAndOpenedAtBefore(eq(CashierShiftStatus.OPEN), any())).thenReturn(List.of());

        DailyLedgerResponse res = dailyLedgerService.reopen(today, request, owner);

        assertNotNull(res);
        assertEquals(DailyLedgerStatus.OPEN, closedLedger.getStatus());
        assertEquals("Đối soát lại hóa đơn bị sót ca tối", closedLedger.getOpenReason());
        assertNull(closedLedger.getClosedBy());
        verify(auditLogService).log(eq("DailyLedger"), eq(1L), eq("DAILY_LEDGER_REOPENED"), eq(owner), any());
    }

    @Test
    @DisplayName("Sau khi chốt sổ ngày, phiếu chốt ca của ngày đó bị chặn mở lại")
    void shiftCannotBeReopenedWhenDailyLedgerIsClosed() {
        CashierShift shift = CashierShift.builder()
                .id(101L)
                .status(CashierShiftStatus.CLOSED)
                .openedBy(receptionist)
                .closedAt(today.atTime(17, 0))
                .build();
        when(shiftRepository.findById(101L)).thenReturn(Optional.of(shift));

        DailyLedger closedLedger = DailyLedger.builder()
                .id(1L)
                .date(today)
                .status(DailyLedgerStatus.CLOSED)
                .build();
        when(ledgerRepository.findByDate(today)).thenReturn(Optional.of(closedLedger));

        CashierShiftReopenRequest req = new CashierShiftReopenRequest();
        req.setReason("Mở lại để đếm lại tiền mặt");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                cashierShiftService.reopen(101L, req, owner));

        assertTrue(ex.getMessage().contains("Sổ ngày " + today + " đã chốt"));
        assertTrue(ex.getMessage().contains("Vui lòng mở lại sổ ngày trước khi mở lại ca"));
    }
}
