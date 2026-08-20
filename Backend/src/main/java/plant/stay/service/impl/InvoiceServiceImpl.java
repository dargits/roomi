package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.GroupInvoiceCreateRequest;
import plant.stay.dto.request.InvoiceAdjustRequest;
import plant.stay.dto.request.PaymentRequest;
import plant.stay.dto.response.GroupInvoiceResponse;
import plant.stay.dto.response.InvoiceResponse;
import plant.stay.dto.response.PaymentResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.InvoiceService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final BookingRepository bookingRepository;
    private final GroupBookingRepository groupBookingRepository;
    private final BookingServiceUsageRepository usageRepository;
    private final PaymentRepository paymentRepository;
    private final DepositRepository depositRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public InvoiceResponse getByBooking(Long bookingId) {
        return invoiceRepository.findInvoicesCoveringBooking(bookingId).stream()
            .findFirst()
                .map(this::syncInvoiceStatus)
                .map(this::toResponse)
                .orElse(null);
    }

    @Override
    @Transactional
    public InvoiceResponse getById(Long invoiceId) {
        return toResponse(syncInvoiceStatus(findById(invoiceId)));
    }

    @Override
    @Transactional
    public InvoiceResponse createInvoice(Long bookingId, User actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt phòng"));

        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể lập hóa đơn khi khách đang ở phòng (CHECKED_IN)");
        }

        // Kiểm tra đã có hóa đơn chưa (mỗi booking chỉ có 1 hóa đơn gốc)
        if (invoiceRepository.findByBookingId(bookingId).isPresent()) {
            throw new IllegalArgumentException("Booking này đã có hóa đơn. Dùng API điều chỉnh nếu cần sửa.");
        }

        // Tính tiền phòng
        BigDecimal roomAmount = booking.getActualPrice() != null
                ? booking.getActualPrice()
                : (booking.getExpectedPrice() != null ? booking.getExpectedPrice() : BigDecimal.ZERO);

        // Tính tiền dịch vụ phụ thu
        List<BookingServiceUsage> usages = usageRepository.findByBookingId(bookingId);
        BigDecimal serviceAmount = usages.stream()
                .map(u -> u.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(u.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal total = roomAmount.add(serviceAmount);

        Invoice invoice = Invoice.builder()
                .booking(booking)
                .roomAmount(roomAmount)
                .serviceAmount(serviceAmount)
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(total)
                .status(InvoiceStatus.PENDING)
                .createdBy(actor)
                .build();
        invoice = invoiceRepository.save(invoice);

        // Tự động khấu trừ tiền đặt cọc đã thu trước đó thành một lượt thanh toán của hóa đơn
        List<Deposit> deposits = depositRepository.findByBookingIdOrderByCreatedAtDesc(bookingId);
        for (Deposit deposit : deposits) {
            if (deposit.getStatus() == DepositStatus.COLLECTED || deposit.getStatus() == DepositStatus.SHORT_PAID) {
                BigDecimal effectiveDeposit = deposit.getCollectedAmount() != null ? deposit.getCollectedAmount() : BigDecimal.ZERO;
                if (deposit.getRefundedAmount() != null) {
                    effectiveDeposit = effectiveDeposit.subtract(deposit.getRefundedAmount());
                }
                if (effectiveDeposit.compareTo(BigDecimal.ZERO) > 0) {
                    Payment depositPayment = Payment.builder()
                            .invoice(invoice)
                            .amount(effectiveDeposit)
                            .method(deposit.getPaymentMethod() != null ? deposit.getPaymentMethod() : PaymentMethod.CASH)
                            .paidAt(deposit.getCollectedAt() != null ? deposit.getCollectedAt() : LocalDateTime.now())
                            .collectedBy(deposit.getCollectedBy() != null ? deposit.getCollectedBy() : actor)
                            .note("Trừ tiền đặt cọc đã thu (Mã cọc #" + deposit.getId() + ")")
                            .build();
                    paymentRepository.save(depositPayment);
                }
            }
        }

        // Kiểm tra nếu tổng thanh toán (bao gồm cọc) đã đủ thì chuyển sang PAID
        BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalPaid.compareTo(invoice.getTotalAmount()) >= 0) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoice = invoiceRepository.save(invoice);
        }

        auditLogService.log("Invoice", invoice.getId(), "CREATE", actor,
                "Lập hóa đơn cho booking #" + bookingId + (totalPaid.compareTo(BigDecimal.ZERO) > 0 ? " (đã khấu trừ " + totalPaid + "đ cọc)" : ""));
        return toResponse(invoice);
    }

    @Override
    @Transactional
    public GroupInvoiceResponse getGroupInvoices(Long groupBookingId) {
        findGroupBooking(groupBookingId);
        return toGroupResponse(groupBookingId, invoiceRepository.findByGroupBookingIdOrderByIdAsc(groupBookingId));
    }

    @Override
    @Transactional
    public GroupInvoiceResponse createGroupInvoices(Long groupBookingId, GroupInvoiceCreateRequest request, User actor) {
        if (request.getMode() != InvoiceMode.COMBINED && request.getMode() != InvoiceMode.SEPARATE) {
            throw new IllegalArgumentException("Hóa đơn đoàn chỉ hỗ trợ gộp hoặc tách theo từng phòng");
        }
        GroupBooking groupBooking = findGroupBooking(groupBookingId);
        List<Booking> bookings = bookingRepository.findByGroupBookingId(groupBookingId);
        if (bookings.isEmpty()) {
            throw new IllegalArgumentException("Hồ sơ đoàn chưa có phòng để lập hóa đơn");
        }
        if (bookings.stream().anyMatch(booking -> booking.getStatus() != BookingStatus.CHECKED_IN)) {
            throw new IllegalArgumentException("Chỉ có thể lập hóa đơn đoàn khi tất cả phòng đang CHECKED_IN");
        }
        if (bookings.stream().anyMatch(booking -> !invoiceRepository.findInvoicesCoveringBooking(booking.getId()).isEmpty())) {
            throw new IllegalArgumentException("Đoàn này đã có hóa đơn, không thể đổi cách gộp hoặc tách");
        }

        List<Invoice> invoices = new ArrayList<>();
        if (request.getMode() == InvoiceMode.COMBINED) {
            invoices.add(createInvoiceForBookings(groupBooking, bookings, InvoiceMode.COMBINED, request.getNote(), actor));
        } else {
            for (Booking booking : bookings) {
                invoices.add(createInvoiceForBookings(groupBooking, List.of(booking), InvoiceMode.SEPARATE,
                        request.getNote(), actor));
            }
        }
        auditLogService.log("GroupBooking", groupBookingId, "CREATE_INVOICES", actor,
                "Lập " + (request.getMode() == InvoiceMode.COMBINED ? "hóa đơn gộp" : "hóa đơn tách")
                        + " cho đoàn gồm " + bookings.size() + " phòng");
        return toGroupResponse(groupBookingId, invoices);
    }

    @Override
    @Transactional
    public InvoiceResponse adjustInvoice(Long invoiceId, InvoiceAdjustRequest request, User actor) {
        Invoice original = findById(invoiceId);

        // Hóa đơn đã PAID là immutable — phải tạo bản điều chỉnh (QTN-11)
        if (original.getStatus() != InvoiceStatus.PAID) {
            throw new IllegalArgumentException("Chỉ có thể tạo hóa đơn điều chỉnh cho hóa đơn đã thanh toán (PAID)");
        }

        BigDecimal newTotal = original.getTotalAmount().subtract(request.getDiscountAmount());
        if (newTotal.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Số tiền điều chỉnh không thể vượt quá tổng hóa đơn gốc");
        }

        // Đánh dấu hóa đơn gốc là ADJUSTED
        original.setStatus(InvoiceStatus.ADJUSTED);
        invoiceRepository.save(original);

        // Tạo hóa đơn điều chỉnh mới
        Invoice adjusted = Invoice.builder()
                .booking(original.getBooking())
            .groupBooking(original.getGroupBooking())
            .mode(original.getMode())
                .roomAmount(original.getRoomAmount())
                .serviceAmount(original.getServiceAmount())
                .discountAmount(request.getDiscountAmount())
                .totalAmount(newTotal)
                .status(InvoiceStatus.PENDING)
                .adjustmentOf(original)
                .note(request.getNote())
                .createdBy(actor)
                .build();
        adjusted = invoiceRepository.save(adjusted);
        auditLogService.log("Invoice", adjusted.getId(), "ADJUST", actor,
                "Hóa đơn điều chỉnh từ invoice #" + invoiceId);
        return toResponse(adjusted);
    }

    private Invoice createInvoiceForBookings(GroupBooking groupBooking, List<Booking> bookings,
                                             InvoiceMode mode, String note, User actor) {
        BigDecimal roomAmount = bookings.stream().map(this::roomAmountFor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal serviceAmount = bookings.stream().map(this::serviceAmountFor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Invoice invoice = invoiceRepository.save(Invoice.builder()
                .booking(bookings.get(0))
                .groupBooking(groupBooking)
                .mode(mode)
                .roomAmount(roomAmount)
                .serviceAmount(serviceAmount)
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(roomAmount.add(serviceAmount))
                .status(InvoiceStatus.PENDING)
                .note(requestNote(note))
                .createdBy(actor)
                .build());
        applyDeposits(invoice, bookings, actor);
        invoice = syncInvoiceStatus(invoice);
        auditLogService.log("Invoice", invoice.getId(), "CREATE", actor,
                "Lập hóa đơn " + (mode == InvoiceMode.COMBINED ? "gộp" : "tách") + " cho đoàn #"
                        + groupBooking.getId());
        return invoice;
    }

    private BigDecimal roomAmountFor(Booking booking) {
        if (booking.getActualPrice() != null) return booking.getActualPrice();
        return booking.getExpectedPrice() != null ? booking.getExpectedPrice() : BigDecimal.ZERO;
    }

    private BigDecimal serviceAmountFor(Booking booking) {
        return usageRepository.findByBookingId(booking.getId()).stream()
                .map(usage -> usage.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(usage.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void applyDeposits(Invoice invoice, List<Booking> bookings, User actor) {
        for (Booking booking : bookings) {
            for (Deposit deposit : depositRepository.findByBookingIdOrderByCreatedAtDesc(booking.getId())) {
                if (deposit.getStatus() != DepositStatus.COLLECTED && deposit.getStatus() != DepositStatus.SHORT_PAID) continue;
                BigDecimal effectiveDeposit = deposit.getCollectedAmount() != null ? deposit.getCollectedAmount() : BigDecimal.ZERO;
                if (deposit.getRefundedAmount() != null) effectiveDeposit = effectiveDeposit.subtract(deposit.getRefundedAmount());
                if (deposit.getPenaltyAmount() != null) effectiveDeposit = effectiveDeposit.subtract(deposit.getPenaltyAmount());
                if (effectiveDeposit.compareTo(BigDecimal.ZERO) <= 0) continue;
                paymentRepository.save(Payment.builder()
                        .invoice(invoice)
                        .amount(effectiveDeposit)
                        .method(deposit.getPaymentMethod() != null ? deposit.getPaymentMethod() : PaymentMethod.CASH)
                        .paidAt(deposit.getCollectedAt() != null ? deposit.getCollectedAt() : LocalDateTime.now())
                        .collectedBy(deposit.getCollectedBy() != null ? deposit.getCollectedBy() : actor)
                        .note("Trừ tiền đặt cọc đã thu (Mã cọc #" + deposit.getId() + ", booking #" + booking.getId() + ")")
                        .build());
            }
        }
    }

    private GroupBooking findGroupBooking(Long groupBookingId) {
        return groupBookingRepository.findById(groupBookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ đặt phòng đoàn"));
    }

    private GroupInvoiceResponse toGroupResponse(Long groupBookingId, List<Invoice> invoices) {
        BigDecimal roomAmount = invoices.stream().map(Invoice::getRoomAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal serviceAmount = invoices.stream().map(Invoice::getServiceAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal discountAmount = invoices.stream().map(Invoice::getDiscountAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalAmount = invoices.stream().map(Invoice::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paidAmount = invoices.stream().flatMap(invoice -> paymentRepository.findByInvoiceId(invoice.getId()).stream())
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return GroupInvoiceResponse.builder()
                .groupBookingId(groupBookingId)
                .mode(invoices.isEmpty() ? null : invoices.get(0).getMode())
                .roomAmount(roomAmount)
                .serviceAmount(serviceAmount)
                .discountAmount(discountAmount)
                .totalAmount(totalAmount)
                .paidAmount(paidAmount)
                .outstandingAmount(totalAmount.subtract(paidAmount).max(BigDecimal.ZERO))
                .invoices(invoices.stream().map(this::toResponse).collect(Collectors.toList()))
                .build();
    }

    private String requestNote(String note) {
        return note == null || note.isBlank() ? null : note.trim();
    }

    @Override
    @Transactional
    public PaymentResponse addPayment(Long invoiceId, PaymentRequest request, User actor) {
        Invoice invoice = findById(invoiceId);
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new IllegalArgumentException("Hóa đơn đã được thanh toán, không thể thêm thanh toán");
        }
        if (invoice.getStatus() == InvoiceStatus.ADJUSTED) {
            throw new IllegalArgumentException("Hóa đơn đã điều chỉnh, vui lòng thanh toán hóa đơn điều chỉnh mới");
        }

        Payment payment = Payment.builder()
                .invoice(invoice)
                .amount(request.getAmount())
                .method(request.getMethod())
                .paidAt(LocalDateTime.now())
                .collectedBy(actor)
                .note(request.getNote())
                .build();
        payment = paymentRepository.save(payment);

        // Kiểm tra tổng đã thanh toán
        BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoiceId).stream()
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalPaid.compareTo(invoice.getTotalAmount()) >= 0) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoiceRepository.save(invoice);
            auditLogService.log("Invoice", invoiceId, "PAID", actor, "Hóa đơn đã thanh toán đủ");
        }
        auditLogService.log("Payment", payment.getId(), "ADD_PAYMENT", actor,
                "Thanh toán " + request.getAmount() + " " + request.getMethod());
        return toPaymentResponse(payment);
    }

    @Override
    public List<PaymentResponse> getPayments(Long invoiceId) {
        findById(invoiceId);
        return paymentRepository.findByInvoiceId(invoiceId).stream()
                .map(this::toPaymentResponse).collect(Collectors.toList());
    }

    private Invoice syncInvoiceStatus(Invoice invoice) {
        if (invoice == null || invoice.getStatus() != InvoiceStatus.PENDING) {
            return invoice;
        }

        // 1. Kiểm tra xem cọc đã được tạo thành Payment chưa
        boolean hasDepositPayment = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                .anyMatch(p -> p.getNote() != null && (p.getNote().contains("đặt cọc") || p.getNote().contains("cọc") || p.getNote().contains("Deposit")));

        if (!hasDepositPayment && invoice.getBooking() != null) {
            List<Deposit> deposits = depositRepository.findByBookingIdOrderByCreatedAtDesc(invoice.getBooking().getId());
            for (Deposit d : deposits) {
                if (d.getStatus() == DepositStatus.COLLECTED || d.getStatus() == DepositStatus.SHORT_PAID) {
                    BigDecimal effectiveDeposit = d.getCollectedAmount() != null ? d.getCollectedAmount() : BigDecimal.ZERO;
                    if (d.getRefundedAmount() != null) effectiveDeposit = effectiveDeposit.subtract(d.getRefundedAmount());
                    if (d.getPenaltyAmount() != null) effectiveDeposit = effectiveDeposit.subtract(d.getPenaltyAmount());
                    if (effectiveDeposit.compareTo(BigDecimal.ZERO) > 0) {
                        Payment depositPayment = Payment.builder()
                                .invoice(invoice)
                                .amount(effectiveDeposit)
                                .method(d.getPaymentMethod() != null ? d.getPaymentMethod() : PaymentMethod.CASH)
                                .paidAt(d.getCollectedAt() != null ? d.getCollectedAt() : LocalDateTime.now())
                                .collectedBy(d.getCollectedBy() != null ? d.getCollectedBy() : invoice.getCreatedBy())
                                .note("Trừ tiền đặt cọc đã thu (Mã cọc #" + d.getId() + ")")
                                .build();
                        paymentRepository.save(depositPayment);
                    }
                }
            }
        }

        // 2. Tính tổng thanh toán từ tất cả Payment
        BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalPaid.compareTo(invoice.getTotalAmount()) >= 0) {
            invoice.setStatus(InvoiceStatus.PAID);
            return invoiceRepository.save(invoice);
        }
        return invoice;
    }

    private Invoice findById(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn"));
    }

    private InvoiceResponse toResponse(Invoice inv) {
        return InvoiceResponse.builder()
                .id(inv.getId())
                .bookingId(inv.getBooking().getId())
            .groupBookingId(inv.getGroupBooking() != null ? inv.getGroupBooking().getId() : null)
            .mode(inv.getMode())
                .roomAmount(inv.getRoomAmount())
                .serviceAmount(inv.getServiceAmount())
                .discountAmount(inv.getDiscountAmount())
                .totalAmount(inv.getTotalAmount())
                .status(inv.getStatus())
                .adjustmentOfId(inv.getAdjustmentOf() != null ? inv.getAdjustmentOf().getId() : null)
                .note(inv.getNote())
                .createdAt(inv.getCreatedAt())
                .build();
    }

    private PaymentResponse toPaymentResponse(Payment p) {
        return PaymentResponse.builder()
                .id(p.getId())
                .invoiceId(p.getInvoice().getId())
                .amount(p.getAmount())
                .method(p.getMethod())
                .paidAt(p.getPaidAt())
                .collectedByName(p.getCollectedBy() != null ? p.getCollectedBy().getName() : null)
                .note(p.getNote())
                .build();
    }
}
