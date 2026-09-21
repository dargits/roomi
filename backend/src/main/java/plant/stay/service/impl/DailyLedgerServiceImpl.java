package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.DailyLedgerReopenRequest;
import plant.stay.dto.response.CashierShiftResponse;
import plant.stay.dto.response.DailyLedgerResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.CashierShiftClosingRepository;
import plant.stay.repository.CashierShiftRepository;
import plant.stay.repository.DailyLedgerRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.DailyLedgerService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyLedgerServiceImpl implements DailyLedgerService {

    private final DailyLedgerRepository ledgerRepository;
    private final CashierShiftRepository shiftRepository;
    private final CashierShiftClosingRepository closingRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public DailyLedgerResponse preview(LocalDate date, User actor) {
        assertFinancialRole(actor);
        return buildResponse(date);
    }

    @Override
    @Transactional
    public DailyLedgerResponse close(LocalDate date, User actor) {
        assertFinancialRole(actor);

        // Kiểm tra đã chốt chưa
        if (ledgerRepository.findByDate(date).map(l -> l.getStatus() == DailyLedgerStatus.CLOSED).orElse(false)) {
            throw new BusinessException("Sổ ngày " + date + " đã được chốt.");
        }

        // Kiểm tra còn ca nào OPEN chưa chốt (mở trong ngày hoặc trước đó và chưa đóng)
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();
        List<CashierShift> openShifts = shiftRepository.findByStatusAndOpenedAtBefore(CashierShiftStatus.OPEN, endOfDay);
        if (!openShifts.isEmpty()) {
            String names = openShifts.stream()
                    .map(s -> "Ca #" + s.getId() + " (" + s.getOpenedBy().getName() + ")")
                    .collect(Collectors.joining(", "));
            throw new BusinessException("Chưa thể chốt sổ ngày " + date + ". Các ca chưa chốt: " + names);
        }

        // Tính tổng từ các CashierShiftClosing của ngày
        DailyLedgerResponse summary = buildResponse(date);

        // Lưu hoặc cập nhật DailyLedger
        DailyLedger ledger = ledgerRepository.findByDate(date).orElse(DailyLedger.builder().date(date).build());
        ledger.setStatus(DailyLedgerStatus.CLOSED);
        ledger.setClosedBy(actor);
        ledger.setClosedAt(LocalDateTime.now());
        ledger.setOpenReason(null);
        applySnapshot(ledger, summary);
        ledgerRepository.save(ledger);

        auditLogService.log("DailyLedger", ledger.getId(), "DAILY_LEDGER_CLOSED", actor,
                "Chot so ngay " + date + ". Tong tien mat ly thuyet=" + summary.getTotalExpectedCash()
                        + ", thuc dem=" + summary.getTotalActualCash()
                        + ", chenh lech=" + summary.getTotalDiscrepancy());

        return buildResponse(date);
    }

    @Override
    @Transactional
    public DailyLedgerResponse reopen(LocalDate date, DailyLedgerReopenRequest request, User actor) {
        if (actor.getRole() != Role.OWNER) {
            throw new BusinessException("Chỉ Chủ cơ sở được mở lại sổ ngày.");
        }
        DailyLedger ledger = ledgerRepository.findByDate(date)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sổ ngày " + date));
        if (ledger.getStatus() != DailyLedgerStatus.CLOSED) {
            throw new BusinessException("Sổ ngày " + date + " chưa được chốt.");
        }
        ledger.setStatus(DailyLedgerStatus.OPEN);
        ledger.setOpenReason(request.getReason());
        ledger.setClosedBy(null);
        ledger.setClosedAt(null);
        ledgerRepository.save(ledger);

        auditLogService.log("DailyLedger", ledger.getId(), "DAILY_LEDGER_REOPENED", actor,
                "Mo lai so ngay " + date + ". Ly do: " + request.getReason());

        return buildResponse(date);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DailyLedgerResponse> list(LocalDate from, LocalDate to, User actor) {
        assertFinancialRole(actor);
        LocalDate effectiveFrom = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate effectiveTo = to != null ? to : LocalDate.now();
        return ledgerRepository.findByDateBetweenOrderByDateDesc(effectiveFrom, effectiveTo)
                .stream()
                .map(l -> buildResponse(l.getDate()))
                .collect(Collectors.toList());
    }

    // ---- Helpers ----

    private DailyLedgerResponse buildResponse(LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        // Lấy trực tiếp tất cả phiếu chốt ca có closedAt trong ngày
        List<CashierShiftClosing> closings = closingRepository.findByClosedAtBetweenOrderByClosedAtDesc(startOfDay, endOfDay);

        // Ca còn mở (có thể chặn chốt sổ)
        List<CashierShift> openShifts = shiftRepository.findByStatusAndOpenedAtBefore(CashierShiftStatus.OPEN, endOfDay);

        // Tính tổng
        BigDecimal totalInvoiceCash = sum(closings, c -> z(c.getInvoiceCash()));
        BigDecimal totalInvoiceTransfer = sum(closings, c -> z(c.getInvoiceTransfer()));
        BigDecimal totalInvoiceCard = sum(closings, c -> z(c.getInvoiceCard()));
        BigDecimal totalDepositCash = sum(closings, c -> z(c.getDepositCash()));
        BigDecimal totalDepositTransfer = sum(closings, c -> z(c.getDepositTransfer()));
        BigDecimal totalDepositCard = sum(closings, c -> z(c.getDepositCard()));
        BigDecimal totalRefundCash = sum(closings, c -> z(c.getRefundCash()));
        BigDecimal totalRefundTransfer = sum(closings, c -> z(c.getRefundTransfer()));
        BigDecimal totalRefundCard = sum(closings, c -> z(c.getRefundCard()));
        BigDecimal totalExpectedCash = sum(closings, c -> z(c.getExpectedCash()));
        BigDecimal totalActualCash = sum(closings, c -> z(c.getActualCash()));
        BigDecimal totalDiscrepancy = sum(closings, c -> z(c.getDiscrepancy()));

        // Map CashierShiftClosing -> CashierShiftResponse
        List<CashierShiftResponse> shiftResponses = closings.stream().map(closing -> {
            CashierShift s = closing.getShift();
            return CashierShiftResponse.builder()
                    .id(s.getId()).closingId(closing.getId()).status(CashierShiftStatus.CLOSED)
                    .openedById(s.getOpenedBy().getId()).openedByName(s.getOpenedBy().getName())
                    .openedAt(s.getOpenedAt()).openingCash(closing.getOpeningCash()).openingNote(s.getOpeningNote())
                    .closedById(closing.getClosedBy().getId()).closedByName(closing.getClosedBy().getName())
                    .closedAt(closing.getClosedAt())
                    .invoiceCash(closing.getInvoiceCash()).invoiceTransfer(closing.getInvoiceTransfer()).invoiceCard(closing.getInvoiceCard())
                    .depositCash(closing.getDepositCash()).depositTransfer(closing.getDepositTransfer()).depositCard(closing.getDepositCard())
                    .refundCash(closing.getRefundCash()).refundTransfer(closing.getRefundTransfer()).refundCard(closing.getRefundCard())
                    .expectedCash(closing.getExpectedCash()).actualCash(closing.getActualCash())
                    .discrepancy(closing.getDiscrepancy()).discrepancyNote(closing.getDiscrepancyNote())
                    .build();
        }).collect(Collectors.toList());

        List<DailyLedgerResponse.OpenShiftInfo> openShiftInfos = openShifts.stream()
                .map(s -> DailyLedgerResponse.OpenShiftInfo.builder()
                        .shiftId(s.getId()).openedByName(s.getOpenedBy().getName()).openedAt(s.getOpenedAt()).build())
                .collect(Collectors.toList());

        Optional<DailyLedger> existing = ledgerRepository.findByDate(date);

        return DailyLedgerResponse.builder()
                .date(date)
                .status(existing.map(DailyLedger::getStatus).orElse(DailyLedgerStatus.OPEN))
                .shifts(shiftResponses)
                .openShifts(openShiftInfos)
                .totalInvoiceCash(totalInvoiceCash).totalInvoiceTransfer(totalInvoiceTransfer).totalInvoiceCard(totalInvoiceCard)
                .totalDepositCash(totalDepositCash).totalDepositTransfer(totalDepositTransfer).totalDepositCard(totalDepositCard)
                .totalRefundCash(totalRefundCash).totalRefundTransfer(totalRefundTransfer).totalRefundCard(totalRefundCard)
                .totalExpectedCash(totalExpectedCash).totalActualCash(totalActualCash).totalDiscrepancy(totalDiscrepancy)
                .cashHandoverAmount(totalExpectedCash)
                .closedById(existing.map(l -> l.getClosedBy() != null ? l.getClosedBy().getId() : null).orElse(null))
                .closedByName(existing.map(l -> l.getClosedBy() != null ? l.getClosedBy().getName() : null).orElse(null))
                .closedAt(existing.map(DailyLedger::getClosedAt).orElse(null))
                .openReason(existing.map(DailyLedger::getOpenReason).orElse(null))
                .build();
    }

    private void applySnapshot(DailyLedger ledger, DailyLedgerResponse s) {
        ledger.setTotalInvoiceCash(s.getTotalInvoiceCash()); ledger.setTotalInvoiceTransfer(s.getTotalInvoiceTransfer()); ledger.setTotalInvoiceCard(s.getTotalInvoiceCard());
        ledger.setTotalDepositCash(s.getTotalDepositCash()); ledger.setTotalDepositTransfer(s.getTotalDepositTransfer()); ledger.setTotalDepositCard(s.getTotalDepositCard());
        ledger.setTotalRefundCash(s.getTotalRefundCash()); ledger.setTotalRefundTransfer(s.getTotalRefundTransfer()); ledger.setTotalRefundCard(s.getTotalRefundCard());
        ledger.setTotalExpectedCash(s.getTotalExpectedCash()); ledger.setTotalActualCash(s.getTotalActualCash()); ledger.setTotalDiscrepancy(s.getTotalDiscrepancy());
        ledger.setCashHandoverAmount(s.getCashHandoverAmount());
    }

    @FunctionalInterface
    private interface Extractor { BigDecimal extract(CashierShiftClosing c); }

    private BigDecimal sum(List<CashierShiftClosing> list, Extractor fn) {
        return list.stream().map(fn::extract).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal z(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    private void assertFinancialRole(User actor) {
        if (actor.getRole() != Role.OWNER && actor.getRole() != Role.ACCOUNTANT) {
            throw new BusinessException("Chỉ Chủ cơ sở hoặc Kế toán được truy cập sổ ngày.");
        }
    }
}
