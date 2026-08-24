package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.DepositProcessRequest;
import plant.stay.dto.request.DepositRequest;
import plant.stay.dto.response.DepositResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.util.AuthUtil;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

/**
 * NCL-11-CN-002 đến NCL-11-CN-006: Quản lý đặt cọc theo từng booking
 *
 * GET    /api/v1/bookings/{bookingId}/deposit        — lấy khoản cọc (NCL-11-CN-006)
 * POST   /api/v1/bookings/{bookingId}/deposit        — thu tiền cọc (NCL-11-CN-002)
 * GET    /api/v1/bookings/{bookingId}/deposit/fee    — tính phí hủy dự kiến (NCL-11-CN-004)
 * POST   /api/v1/bookings/{bookingId}/deposit/refund — hoàn tiền cọc (NCL-11-CN-003)
 * POST   /api/v1/bookings/{bookingId}/deposit/no-show — xử lý no-show (NCL-11-CN-005)
 */
@RestController
@RequestMapping("/api/v1/bookings/{bookingId}/deposit")
@CrossOrigin("*")
@RequiredArgsConstructor
public class DepositController {

    private final DepositRepository depositRepo;
    private final DepositPolicyRepository policyRepo;
    private final BookingRepository bookingRepo;
    private final CancellationPolicyRepository cancellationPolicyRepo;
    private final InvoiceRepository invoiceRepo;
    private final PaymentRepository paymentRepo;
    private final AuditLogService auditLogService;
    private final AuthUtil authUtil;

    // NCL-11-CN-006: Xem lịch sử cọc của booking
    @GetMapping
    public ResponseEntity<List<DepositResponse>> getByBooking(@PathVariable Long bookingId,
                                                               HttpServletRequest request) {
        checkReadAccess(request);
        List<DepositResponse> result = depositRepo.findByBookingIdOrderByCreatedAtDesc(bookingId)
                .stream().map(this::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // NCL-11-CN-004: Tính phí hủy dự kiến
    @GetMapping("/fee")
    public ResponseEntity<?> getCancellationFee(@PathVariable Long bookingId, HttpServletRequest request) {
        checkReadAccess(request);
        Booking booking = findBooking(bookingId);
        BigDecimal fee = calculateCancellationFee(booking);
        Deposit deposit = depositRepo.findFirstByBookingIdOrderByCreatedAtDesc(bookingId).orElse(null);
        BigDecimal collected = deposit != null ? deposit.getCollectedAmount() : BigDecimal.ZERO;
        BigDecimal refund = collected != null ? collected.subtract(fee).max(BigDecimal.ZERO) : BigDecimal.ZERO;
        return ResponseEntity.ok(java.util.Map.of(
                "cancellationFee", fee,
                "collectedAmount", collected != null ? collected : BigDecimal.ZERO,
                "refundAmount", refund,
                "bookingId", bookingId
        ));
    }

    // NCL-11-CN-002: Thu tiền đặt cọc
    @PostMapping
    public ResponseEntity<DepositResponse> recordDeposit(@PathVariable Long bookingId,
                                                          @Valid @RequestBody DepositRequest req,
                                                          HttpServletRequest request) {
        User actor = checkReceptionistOrOwner(request);
        Booking booking = findBooking(bookingId);

        // Không cho phép thu cọc nếu đặt phòng đã kết thúc hoặc bị hủy
        if (booking.getStatus() == BookingStatus.CHECKED_OUT ||
            booking.getStatus() == BookingStatus.CANCELLED ||
            booking.getStatus() == BookingStatus.NO_SHOW) {
            throw new IllegalArgumentException("Không thể thu cọc cho đặt phòng ở trạng thái " + booking.getStatus());
        }

        // Kiểm tra xem đặt phòng này đã được thu cọc trước đó chưa
        List<Deposit> existingDeposits = depositRepo.findByBookingIdOrderByCreatedAtDesc(bookingId);
        boolean alreadyCollected = existingDeposits.stream().anyMatch(d ->
            d.getStatus() == DepositStatus.COLLECTED ||
            d.getStatus() == DepositStatus.REFUNDED ||
            d.getStatus() == DepositStatus.PARTIALLY_REFUNDED ||
            d.getStatus() == DepositStatus.FORFEITED
        );
        if (alreadyCollected) {
            throw new IllegalArgumentException("Đặt phòng này đã được thu đủ tiền cọc. Không thể thu cọc lần nữa.");
        }

        // NCL-11-CN-002-TC-02: Số tiền cọc không được vượt tổng tiền phòng
        if (booking.getExpectedPrice() != null && req.getAmount().compareTo(booking.getExpectedPrice()) > 0) {
            throw new IllegalArgumentException("Số tiền cọc không được vượt quá tổng tiền phòng dự kiến");
        }

        // Tính số tiền yêu cầu theo chính sách
        BigDecimal requiredAmount = calculateRequiredDeposit(booking);

        // NCL-11-CN-002-TC-03: Thu thiếu → cần lý do
        boolean isShortPaid = requiredAmount != null && req.getAmount().compareTo(requiredAmount) < 0;
        if (isShortPaid && (req.getShortPaidReason() == null || req.getShortPaidReason().isBlank())) {
            throw new IllegalArgumentException("Vui lòng nhập lý do thu thiếu so với chính sách");
        }

        Deposit deposit = Deposit.builder()
                .booking(booking)
                .requiredAmount(requiredAmount)
                .collectedAmount(req.getAmount())
                .paymentMethod(req.getPaymentMethod())
                .status(isShortPaid ? DepositStatus.SHORT_PAID : DepositStatus.COLLECTED)
                .shortPaidReason(req.getShortPaidReason())
                .note(req.getNote())
                .collectedBy(actor)
                .collectedAt(LocalDateTime.now())
                .build();
        deposit = depositRepo.save(deposit);

        // Nếu hóa đơn đã được lập trước đó và đang chờ thanh toán, tự động khấu trừ cọc vào hóa đơn
        final Deposit savedDeposit = deposit;
        invoiceRepo.findByBookingId(bookingId).ifPresent(inv -> {
            if (inv.getStatus() == InvoiceStatus.PENDING) {
                Payment depositPayment = Payment.builder()
                        .invoice(inv)
                        .amount(req.getAmount())
                        .method(req.getPaymentMethod() != null ? req.getPaymentMethod() : PaymentMethod.CASH)
                        .paidAt(LocalDateTime.now())
                        .collectedBy(actor)
                        .note("Trừ tiền đặt cọc đã thu (Mã cọc #" + savedDeposit.getId() + ")")
                        .build();
                paymentRepo.save(depositPayment);

                BigDecimal totalPaid = paymentRepo.findByInvoiceId(inv.getId()).stream()
                        .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                if (totalPaid.compareTo(inv.getTotalAmount()) >= 0) {
                    inv.setStatus(InvoiceStatus.PAID);
                    invoiceRepo.save(inv);
                }
            }
        });

        auditLogService.log("Deposit", deposit.getId(), "RECORD", actor,
                "Thu cọc " + req.getAmount() + "đ cho booking #" + bookingId
                + (isShortPaid ? " (thu thiếu: " + req.getShortPaidReason() + ")" : ""));
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(deposit));
    }

    // NCL-11-CN-003: Hoàn tiền cọc khi hủy trong thời hạn miễn phí
    @PostMapping("/refund")
    public ResponseEntity<DepositResponse> refundDeposit(@PathVariable Long bookingId,
                                                          @RequestBody DepositProcessRequest req,
                                                          HttpServletRequest request) {
        User actor = checkReceptionistOrOwner(request);
        Deposit deposit = findDeposit(bookingId);

        BigDecimal fee = calculateCancellationFee(deposit.getBooking());
        BigDecimal collected = deposit.getCollectedAmount() != null ? deposit.getCollectedAmount() : BigDecimal.ZERO;
        BigDecimal refund = collected.subtract(fee).max(BigDecimal.ZERO);

        deposit.setPenaltyAmount(fee);
        deposit.setRefundedAmount(refund);
        deposit.setStatus(fee.compareTo(BigDecimal.ZERO) == 0 ? DepositStatus.REFUNDED : DepositStatus.PARTIALLY_REFUNDED);
        deposit.setNote(req.getReason());
        deposit.setProcessedBy(actor);
        deposit.setProcessedAt(LocalDateTime.now());
        deposit = depositRepo.save(deposit);

        auditLogService.log("Deposit", deposit.getId(), "REFUND", actor,
                "Hoàn cọc " + refund + "đ (phí hủy: " + fee + "đ) booking #" + bookingId);
        return ResponseEntity.ok(toResponse(deposit));
    }

    // NCL-11-CN-005: Xử lý cọc khi khách không đến (no-show)
    @PostMapping("/no-show")
    public ResponseEntity<DepositResponse> noShowDeposit(@PathVariable Long bookingId,
                                                          @RequestBody DepositProcessRequest req,
                                                          HttpServletRequest request) {
        User actor = checkReceptionistOrOwner(request);
        Deposit deposit = findDeposit(bookingId);
        BigDecimal collected = deposit.getCollectedAmount() != null ? deposit.getCollectedAmount() : BigDecimal.ZERO;

        // QTN-20: Mặc định toàn bộ cọc thành phí phạt; OWNER có thể override
        BigDecimal penalty;
        BigDecimal refund = BigDecimal.ZERO;
        if (req.getPenaltyOverride() != null && actor.getRole() == Role.OWNER) {
            // OWNER override — NCL-11-CN-005-AC bổ sung
            penalty = req.getPenaltyOverride().min(collected);
            refund = collected.subtract(penalty).max(BigDecimal.ZERO);
            if (req.getReason() == null || req.getReason().isBlank()) {
                throw new IllegalArgumentException("Vui lòng nhập lý do khi override phí phạt no-show");
            }
        } else {
            penalty = collected; // 100% thành phí phạt (QTN-20)
        }

        deposit.setPenaltyAmount(penalty);
        deposit.setRefundedAmount(refund);
        deposit.setStatus(DepositStatus.FORFEITED);
        deposit.setNote("No-show. " + (req.getReason() != null ? req.getReason() : ""));
        deposit.setProcessedBy(actor);
        deposit.setProcessedAt(LocalDateTime.now());
        deposit = depositRepo.save(deposit);

        auditLogService.log("Deposit", deposit.getId(), "NO_SHOW_FORFEIT", actor,
                "Tịch thu cọc " + penalty + "đ do no-show booking #" + bookingId);
        return ResponseEntity.ok(toResponse(deposit));
    }

    // ===== Private helpers =====

    private Booking findBooking(Long bookingId) {
        return bookingRepo.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt phòng #" + bookingId));
    }

    private Deposit findDeposit(Long bookingId) {
        return depositRepo.findFirstByBookingIdOrderByCreatedAtDesc(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khoản cọc cho booking #" + bookingId));
    }

    private BigDecimal calculateRequiredDeposit(Booking booking) {
        if (booking.getExpectedPrice() == null) return null;
        // Tìm chính sách cọc cho loại phòng, fallback mặc định (QTN-18)
        DepositPolicy policy = null;
        if (booking.getRoomType() != null) {
            policy = policyRepo.findFirstByRoomTypeIdAndActiveTrue(booking.getRoomType().getId()).orElse(null);
        }
        if (policy == null) {
            policy = policyRepo.findFirstByRoomTypeIsNullAndActiveTrue().orElse(null);
        }
        if (policy == null) return null; // Không có chính sách → không tính cọc
        return booking.getExpectedPrice()
                .multiply(policy.getDepositPercent())
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateCancellationFee(Booking booking) {
        Deposit deposit = depositRepo.findFirstByBookingIdOrderByCreatedAtDesc(booking.getId()).orElse(null);
        if (deposit == null || deposit.getCollectedAmount() == null) return BigDecimal.ZERO;

        // Tìm chính sách hủy (QTN-19)
        CancellationPolicy cancelPolicy = null;
        if (booking.getRoomType() != null) {
            cancelPolicy = cancellationPolicyRepo.findFirstByRoomTypeId(booking.getRoomType().getId()).orElse(null);
        }
        if (cancelPolicy == null) {
            cancelPolicy = cancellationPolicyRepo.findByRoomTypeIsNull().orElse(null);
        }
        if (cancelPolicy == null) return BigDecimal.ZERO;

        long hoursUntilCheckIn = ChronoUnit.HOURS.between(LocalDateTime.now(),
                booking.getCheckInDate().atTime(14, 0));

        // Hủy trong thời hạn miễn phí → không mất phí (NCL-11-CN-003)
        if (hoursUntilCheckIn >= cancelPolicy.getFreeCancelHours()) return BigDecimal.ZERO;

        // Hủy muộn → tính phí (NCL-11-CN-004)
        return deposit.getCollectedAmount()
                .multiply(cancelPolicy.getPenaltyPercent())
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
    }

    private User checkAuth(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Vui lòng đăng nhập");
        return user;
    }

    private User checkReadAccess(HttpServletRequest request) {
        User user = checkAuth(request);
        // NCL-11-CN-002-TC-04: Nhân viên buồng phòng không được truy cập
        if (user.getRole() == Role.HOUSEKEEPER) {
            throw new UnauthorizedException("Bạn không có quyền xem thông tin đặt cọc");
        }
        return user;
    }

    private User checkReceptionistOrOwner(HttpServletRequest request) {
        User user = checkAuth(request);
        if (user.getRole() == Role.HOUSEKEEPER) {
            throw new UnauthorizedException("Bạn không có quyền thực hiện thao tác này");
        }
        return user;
    }

    private DepositResponse toResponse(Deposit d) {
        return DepositResponse.builder()
                .id(d.getId())
                .bookingId(d.getBooking() != null ? d.getBooking().getId() : null)
                .requiredAmount(d.getRequiredAmount())
                .collectedAmount(d.getCollectedAmount())
                .refundedAmount(d.getRefundedAmount())
                .penaltyAmount(d.getPenaltyAmount())
                .status(d.getStatus())
                .paymentMethod(d.getPaymentMethod())
                .shortPaidReason(d.getShortPaidReason())
                .note(d.getNote())
                .collectedByName(d.getCollectedBy() != null ? d.getCollectedBy().getName() : null)
                .processedByName(d.getProcessedBy() != null ? d.getProcessedBy().getName() : null)
                .collectedAt(d.getCollectedAt())
                .processedAt(d.getProcessedAt())
                .createdAt(d.getCreatedAt())
                .build();
    }
}
