package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.CashierShiftCloseRequest;
import plant.stay.dto.request.CashierShiftOpenRequest;
import plant.stay.dto.request.CashierShiftReopenRequest;
import plant.stay.dto.response.CashierShiftResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.CashierShiftRepository;
import plant.stay.repository.CashierShiftClosingRepository;
import plant.stay.repository.DepositRepository;
import plant.stay.repository.InvoiceRepository;
import plant.stay.repository.PaymentRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.CashierShiftService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CashierShiftServiceImpl implements CashierShiftService {
    private final CashierShiftRepository shiftRepository;
    private final CashierShiftClosingRepository closingRepository;
    private final PaymentRepository paymentRepository;
    private final DepositRepository depositRepository;
    private final InvoiceRepository invoiceRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public CashierShiftResponse open(CashierShiftOpenRequest request, User actor) {
        if (shiftRepository.findByOpenedByIdAndStatus(actor.getId(), CashierShiftStatus.OPEN).isPresent()) {
            throw new BusinessException("Tài khoản này đang có một ca mở.");
        }
        CashierShift shift = shiftRepository.save(CashierShift.builder()
                .openedBy(actor).openedAt(LocalDateTime.now()).openingCash(zero(request.getOpeningCash()))
                .openingNote(request.getNote()).status(CashierShiftStatus.OPEN).build());
        auditLogService.log("CashierShift", shift.getId(), "SHIFT_OPENED", actor,
                "Mo ca voi quy dau ca " + shift.getOpeningCash());
        return toResponse(shift);
    }

    @Override
    @Transactional(readOnly = true)
    public CashierShiftResponse getCurrent(User actor) {
        CashierShift shift = shiftRepository.findByOpenedByIdAndStatus(actor.getId(), CashierShiftStatus.OPEN)
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản chưa có ca đang mở."));
        return previewResponse(shift);
    }

    @Override
    @Transactional(readOnly = true)
    public CashierShiftResponse preview(Long shiftId, User actor) {
        CashierShift shift = requireShift(shiftId);
        assertOwnShiftOrFinancialRole(shift, actor);
        return shift.getStatus() == CashierShiftStatus.OPEN ? previewResponse(shift) : toResponse(shift);
    }

    @Override
    @Transactional
    public CashierShiftResponse close(Long shiftId, CashierShiftCloseRequest request, User actor) {
        CashierShift shift = requireShift(shiftId);
        assertOwnShift(shift, actor);
        if (shift.getStatus() != CashierShiftStatus.OPEN) throw new BusinessException("Ca đã được chốt.");
        assertNoPendingCheckoutInvoices(shift);
        CashierShiftResponse summary = previewResponse(shift);
        BigDecimal discrepancy = request.getActualCash().subtract(summary.getExpectedCash());
        if (discrepancy.compareTo(BigDecimal.ZERO) != 0 && (request.getExplanation() == null || request.getExplanation().isBlank())) {
            throw new BusinessException("Vui lòng nhập giải thích cho chênh lệch tiền mặt.");
        }
        copySnapshot(shift, summary);
        shift.setActualCash(request.getActualCash());
        shift.setDiscrepancy(discrepancy);
        shift.setDiscrepancyNote(request.getExplanation());
        shift.setClosedBy(actor);
        shift.setClosedAt(LocalDateTime.now());
        shift.setStatus(CashierShiftStatus.CLOSED);
        shiftRepository.save(shift);
        CashierShiftClosing closing = closingRepository.save(CashierShiftClosing.builder()
            .shift(shift).closedBy(actor).closedAt(shift.getClosedAt()).openingCash(shift.getOpeningCash())
            .invoiceCash(zero(shift.getInvoiceCash())).invoiceTransfer(zero(shift.getInvoiceTransfer())).invoiceCard(zero(shift.getInvoiceCard()))
            .depositCash(zero(shift.getDepositCash())).depositTransfer(zero(shift.getDepositTransfer())).depositCard(zero(shift.getDepositCard()))
            .refundCash(zero(shift.getRefundCash())).refundTransfer(zero(shift.getRefundTransfer())).refundCard(zero(shift.getRefundCard()))
            .expectedCash(shift.getExpectedCash()).actualCash(shift.getActualCash()).discrepancy(shift.getDiscrepancy()).discrepancyNote(shift.getDiscrepancyNote()).build());
        auditLogService.log("CashierShift", shift.getId(), "SHIFT_CLOSED", actor,
                "Tien mat ly thuyet=" + shift.getExpectedCash() + ", thuc te=" + shift.getActualCash()
                        + ", chenh lech=" + shift.getDiscrepancy());
        CashierShiftResponse response = toResponse(shift);
        response.setClosingId(closing.getId());
        return response;
    }

    @Override
    @Transactional
    public CashierShiftResponse reopen(Long shiftId, CashierShiftReopenRequest request, User actor) {
        CashierShift shift = requireShift(shiftId);
        if (actor.getRole() != Role.OWNER) throw new BusinessException("Chỉ Chủ cơ sở được mở lại ca.");
        if (shift.getStatus() != CashierShiftStatus.CLOSED) throw new BusinessException("Chỉ có thể mở lại ca đã chốt.");
        auditLogService.log("CashierShift", shift.getId(), "SHIFT_REOPENED", actor,
                "Ly do mo lai: " + request.getReason() + ". So chot cu: ly thuyet=" + shift.getExpectedCash()
                        + ", thuc te=" + shift.getActualCash() + ", chenh lech=" + shift.getDiscrepancy());
        clearClosingSnapshot(shift);
        shift.setStatus(CashierShiftStatus.OPEN);
        return toResponse(shiftRepository.save(shift));
    }

    @Override
    @Transactional(readOnly = true)
    public CashierShiftResponse getById(Long shiftId, User actor) {
        CashierShift shift = requireShift(shiftId);
        assertOwnShiftOrFinancialRole(shift, actor);
        return toResponse(shift);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashierShiftResponse> list(LocalDate date, Boolean hasDiscrepancy) {
        LocalDateTime from = date != null ? date.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime to = date != null ? date.plusDays(1).atStartOfDay() : LocalDateTime.now().plusYears(10);
        return closingRepository.findByClosedAtBetweenOrderByClosedAtDesc(from, to).stream()
            .filter(closing -> hasDiscrepancy == null || !hasDiscrepancy || closing.getDiscrepancy().compareTo(BigDecimal.ZERO) != 0)
            .map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashierShiftResponse> history(User actor) {
        return closingRepository.findByShiftOpenedByIdOrderByClosedAtDesc(actor.getId()).stream()
                .map(this::toResponse).toList();
    }

    private CashierShiftResponse previewResponse(CashierShift shift) {
        CashierShiftResponse response = toResponse(shift);
        Totals totals = calculateTotals(shift);
        response.setInvoiceCash(totals.invoiceCash); response.setInvoiceTransfer(totals.invoiceTransfer); response.setInvoiceCard(totals.invoiceCard);
        response.setDepositCash(totals.depositCash); response.setDepositTransfer(totals.depositTransfer); response.setDepositCard(totals.depositCard);
        response.setRefundCash(totals.refundCash); response.setRefundTransfer(totals.refundTransfer); response.setRefundCard(totals.refundCard);
        response.setExpectedCash(zero(shift.getOpeningCash()).add(totals.invoiceCash).add(totals.depositCash).subtract(totals.refundCash));
        return response;
    }

    private Totals calculateTotals(CashierShift shift) {
        Totals totals = new Totals();
        LocalDateTime end = LocalDateTime.now();
        paymentRepository.findAll().stream()
                .filter(payment -> sameUser(payment.getCollectedBy(), shift.getOpenedBy()))
                .filter(payment -> inRange(payment.getPaidAt(), shift.getOpenedAt(), end))
                .filter(payment -> !isDepositSettlement(payment))
                .forEach(payment -> totals.addInvoice(payment.getMethod(), payment.getAmount()));
        depositRepository.findAll().stream()
                .filter(deposit -> sameUser(deposit.getCollectedBy(), shift.getOpenedBy()))
                .filter(deposit -> inRange(deposit.getCollectedAt(), shift.getOpenedAt(), end))
                .forEach(deposit -> totals.addDeposit(deposit.getPaymentMethod(), deposit.getCollectedAmount()));
        depositRepository.findAll().stream()
                .filter(deposit -> sameUser(deposit.getProcessedBy(), shift.getOpenedBy()))
                .filter(deposit -> inRange(deposit.getProcessedAt(), shift.getOpenedAt(), end))
                .forEach(deposit -> totals.addRefund(deposit.getPaymentMethod(), deposit.getRefundedAmount()));
        return totals;
    }

    private void assertNoPendingCheckoutInvoices(CashierShift shift) {
        List<Long> pending = invoiceRepository.findAll().stream()
                .filter(invoice -> invoice.getBooking() != null && invoice.getBooking().getStatus() == BookingStatus.CHECKED_OUT)
            .filter(invoice -> inRange(invoice.getBooking().getCheckedOutAt(), shift.getOpenedAt(), LocalDateTime.now()))
                .filter(invoice -> invoice.getStatus() == InvoiceStatus.PENDING || invoice.getStatus() == InvoiceStatus.PENDING_PAYMENT || invoice.getStatus() == InvoiceStatus.PENDING_DISCOUNT_APPROVAL)
                .map(Invoice::getId).toList();
        if (!pending.isEmpty()) throw new BusinessException("Không thể chốt ca: hóa đơn trả phòng chưa tất toán " + pending);
    }

    private CashierShift requireShift(Long id) { return shiftRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca #" + id)); }
    private void assertOwnShift(CashierShift shift, User actor) { if (!sameUser(shift.getOpenedBy(), actor)) throw new BusinessException("Chỉ người mở ca mới được chốt ca này."); }
    private void assertOwnShiftOrFinancialRole(CashierShift shift, User actor) {
        if (!sameUser(shift.getOpenedBy(), actor) && actor.getRole() != Role.OWNER && actor.getRole() != Role.ACCOUNTANT) throw new BusinessException("Không có quyền xem ca này.");
    }
    private boolean sameUser(User first, User second) { return first != null && second != null && first.getId().equals(second.getId()); }
    private boolean inRange(LocalDateTime value, LocalDateTime start, LocalDateTime end) { return value != null && !value.isBefore(start) && value.isBefore(end); }
    private boolean isDepositSettlement(Payment payment) { return payment.getNote() != null && payment.getNote().contains("Mã cọc #"); }
    private BigDecimal zero(BigDecimal value) { return value == null ? BigDecimal.ZERO : value; }

    private void copySnapshot(CashierShift shift, CashierShiftResponse response) {
        shift.setInvoiceCash(response.getInvoiceCash()); shift.setInvoiceTransfer(response.getInvoiceTransfer()); shift.setInvoiceCard(response.getInvoiceCard());
        shift.setDepositCash(response.getDepositCash()); shift.setDepositTransfer(response.getDepositTransfer()); shift.setDepositCard(response.getDepositCard());
        shift.setRefundCash(response.getRefundCash()); shift.setRefundTransfer(response.getRefundTransfer()); shift.setRefundCard(response.getRefundCard()); shift.setExpectedCash(response.getExpectedCash());
    }
    private void clearClosingSnapshot(CashierShift shift) {
        shift.setClosedBy(null); shift.setClosedAt(null); shift.setInvoiceCash(null); shift.setInvoiceTransfer(null); shift.setInvoiceCard(null);
        shift.setDepositCash(null); shift.setDepositTransfer(null); shift.setDepositCard(null); shift.setRefundCash(null); shift.setRefundTransfer(null); shift.setRefundCard(null);
        shift.setExpectedCash(null); shift.setActualCash(null); shift.setDiscrepancy(null); shift.setDiscrepancyNote(null);
    }
    private CashierShiftResponse toResponse(CashierShift shift) {
        return CashierShiftResponse.builder().id(shift.getId()).status(shift.getStatus()).openedById(shift.getOpenedBy().getId())
                .openedByName(shift.getOpenedBy().getName()).openedAt(shift.getOpenedAt()).openingCash(shift.getOpeningCash()).openingNote(shift.getOpeningNote())
                .closedById(shift.getClosedBy() == null ? null : shift.getClosedBy().getId()).closedByName(shift.getClosedBy() == null ? null : shift.getClosedBy().getName()).closedAt(shift.getClosedAt())
                .invoiceCash(shift.getInvoiceCash()).invoiceTransfer(shift.getInvoiceTransfer()).invoiceCard(shift.getInvoiceCard()).depositCash(shift.getDepositCash()).depositTransfer(shift.getDepositTransfer()).depositCard(shift.getDepositCard())
                .refundCash(shift.getRefundCash()).refundTransfer(shift.getRefundTransfer()).refundCard(shift.getRefundCard()).expectedCash(shift.getExpectedCash()).actualCash(shift.getActualCash()).discrepancy(shift.getDiscrepancy()).discrepancyNote(shift.getDiscrepancyNote()).build();
    }
    private CashierShiftResponse toResponse(CashierShiftClosing closing) {
        CashierShift shift = closing.getShift();
        return CashierShiftResponse.builder().id(shift.getId()).closingId(closing.getId()).status(CashierShiftStatus.CLOSED)
                .openedById(shift.getOpenedBy().getId()).openedByName(shift.getOpenedBy().getName()).openedAt(shift.getOpenedAt()).openingCash(closing.getOpeningCash()).openingNote(shift.getOpeningNote())
                .closedById(closing.getClosedBy().getId()).closedByName(closing.getClosedBy().getName()).closedAt(closing.getClosedAt())
                .invoiceCash(closing.getInvoiceCash()).invoiceTransfer(closing.getInvoiceTransfer()).invoiceCard(closing.getInvoiceCard()).depositCash(closing.getDepositCash()).depositTransfer(closing.getDepositTransfer()).depositCard(closing.getDepositCard())
                .refundCash(closing.getRefundCash()).refundTransfer(closing.getRefundTransfer()).refundCard(closing.getRefundCard()).expectedCash(closing.getExpectedCash()).actualCash(closing.getActualCash()).discrepancy(closing.getDiscrepancy()).discrepancyNote(closing.getDiscrepancyNote()).build();
    }

    private static class Totals {
        private BigDecimal invoiceCash = BigDecimal.ZERO, invoiceTransfer = BigDecimal.ZERO, invoiceCard = BigDecimal.ZERO;
        private BigDecimal depositCash = BigDecimal.ZERO, depositTransfer = BigDecimal.ZERO, depositCard = BigDecimal.ZERO;
        private BigDecimal refundCash = BigDecimal.ZERO, refundTransfer = BigDecimal.ZERO, refundCard = BigDecimal.ZERO;
        private void addInvoice(PaymentMethod method, BigDecimal amount) { add(method, amount, 0); }
        private void addDeposit(PaymentMethod method, BigDecimal amount) { add(method, amount, 1); }
        private void addRefund(PaymentMethod method, BigDecimal amount) { add(method, amount, 2); }
        private void add(PaymentMethod method, BigDecimal amount, int type) {
            if (method == null || amount == null) return;
            if (type == 0) { if (method == PaymentMethod.CASH) invoiceCash = invoiceCash.add(amount); else if (method == PaymentMethod.TRANSFER) invoiceTransfer = invoiceTransfer.add(amount); else invoiceCard = invoiceCard.add(amount); }
            if (type == 1) { if (method == PaymentMethod.CASH) depositCash = depositCash.add(amount); else if (method == PaymentMethod.TRANSFER) depositTransfer = depositTransfer.add(amount); else depositCard = depositCard.add(amount); }
            if (type == 2) { if (method == PaymentMethod.CASH) refundCash = refundCash.add(amount); else if (method == PaymentMethod.TRANSFER) refundTransfer = refundTransfer.add(amount); else refundCard = refundCard.add(amount); }
        }
    }
}