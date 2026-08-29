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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
        List<Booking> bookings = bookingRepository.findByGroupBookingId(groupBookingId).stream()
                .filter(b -> b.getStatus() != BookingStatus.CANCELLED && b.getStatus() != BookingStatus.NO_SHOW)
                .collect(Collectors.toList());
        if (bookings.isEmpty()) {
            throw new IllegalArgumentException("Hồ sơ đoàn chưa có phòng để lập hóa đơn");
        }
        if (bookings.stream().anyMatch(booking -> booking.getStatus() != BookingStatus.CHECKED_IN)) {
            throw new IllegalArgumentException("Chỉ có thể lập hóa đơn đoàn khi tất cả phòng đều đã nhận phòng (đang ở)");
        }


        for (Booking booking : bookings) {
            List<Invoice> existingInvoices = invoiceRepository.findInvoicesCoveringBooking(booking.getId());
            // Chỉ kiểm tra invoice đang hoạt động (PENDING), bỏ qua invoice đã bị hủy (ADJUSTED)
            List<Invoice> activeExisting = existingInvoices.stream()
                    .filter(inv -> inv.getStatus() != InvoiceStatus.ADJUSTED)
                    .collect(Collectors.toList());
            if (!activeExisting.isEmpty()) {
                Invoice existing = activeExisting.get(0);
                if (existing.getMode() == InvoiceMode.COMBINED) {
                    throw new IllegalArgumentException("Đoàn này đã được lập hóa đơn gộp chung. Dùng nút 'Đổi phương thức' để hủy và tạo lại nếu chưa thanh toán.");
                } else if (existing.getMode() == InvoiceMode.SEPARATE) {
                    throw new IllegalArgumentException("Đoàn này đã được lập hóa đơn tách riêng từng phòng. Dùng nút 'Đổi phương thức' để hủy và tạo lại nếu chưa thanh toán.");
                } else {
                    String roomNum = booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "chưa gán";
                    throw new IllegalArgumentException("Phòng " + roomNum + " trong đoàn đã được lập hóa đơn cá nhân, không thể lập hóa đơn cho toàn đoàn.");
                }
            }
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
        BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalPaid.compareTo(invoice.getTotalAmount()) >= 0 && invoice.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoice = invoiceRepository.save(invoice);
        }
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
        Set<Long> processedDepositIds = new HashSet<>();

        // 1. Áp dụng cọc riêng của từng booking lẻ con (nếu có)
        for (Booking booking : bookings) {
            for (Deposit deposit : depositRepository.findByBookingIdOrderByCreatedAtDesc(booking.getId())) {
                // Bỏ qua nếu là cọc đoàn hoặc đã được xử lý
                if (deposit.getGroupBooking() != null || processedDepositIds.contains(deposit.getId())) continue;
                if (deposit.getStatus() != DepositStatus.COLLECTED && deposit.getStatus() != DepositStatus.SHORT_PAID) continue;
                BigDecimal effectiveDeposit = deposit.getCollectedAmount() != null ? deposit.getCollectedAmount() : BigDecimal.ZERO;
                if (deposit.getRefundedAmount() != null) effectiveDeposit = effectiveDeposit.subtract(deposit.getRefundedAmount());
                if (deposit.getPenaltyAmount() != null) effectiveDeposit = effectiveDeposit.subtract(deposit.getPenaltyAmount());
                if (effectiveDeposit.compareTo(BigDecimal.ZERO) <= 0) continue;

                processedDepositIds.add(deposit.getId());
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

        // 2. Áp dụng cọc của hồ sơ đoàn
        // COMBINED: áp toàn bộ cọc đoàn vào hóa đơn gộp (đúng số tiền cọc đoàn đã thu)
        // SEPARATE: phân bổ cọc đoàn theo tỷ lệ tiền phòng của từng booking trong invoice
        if (invoice.getGroupBooking() != null) {
            List<Deposit> groupDeposits = depositRepository.findByGroupBookingIdOrderByCreatedAtDesc(invoice.getGroupBooking().getId());
            if (!groupDeposits.isEmpty()) {
                // Tính tổng cọc đoàn còn hiệu lực
                BigDecimal totalGroupDeposit = groupDeposits.stream()
                        .filter(d -> !processedDepositIds.contains(d.getId()))
                        .filter(d -> d.getStatus() == DepositStatus.COLLECTED || d.getStatus() == DepositStatus.SHORT_PAID)
                        .map(d -> {
                            BigDecimal eff = d.getCollectedAmount() != null ? d.getCollectedAmount() : BigDecimal.ZERO;
                            if (d.getRefundedAmount() != null) eff = eff.subtract(d.getRefundedAmount());
                            if (d.getPenaltyAmount() != null) eff = eff.subtract(d.getPenaltyAmount());
                            return eff.max(BigDecimal.ZERO);
                        })
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (totalGroupDeposit.compareTo(BigDecimal.ZERO) > 0) {
                    if (invoice.getMode() == InvoiceMode.COMBINED) {
                        // Gộp: áp toàn bộ cọc đoàn vào hóa đơn gộp (đúng số tiền cọc)
                        for (Deposit deposit : groupDeposits) {
                            if (processedDepositIds.contains(deposit.getId())) continue;
                            if (deposit.getStatus() != DepositStatus.COLLECTED && deposit.getStatus() != DepositStatus.SHORT_PAID) continue;
                            BigDecimal effectiveDeposit = deposit.getCollectedAmount() != null ? deposit.getCollectedAmount() : BigDecimal.ZERO;
                            if (deposit.getRefundedAmount() != null) effectiveDeposit = effectiveDeposit.subtract(deposit.getRefundedAmount());
                            if (deposit.getPenaltyAmount() != null) effectiveDeposit = effectiveDeposit.subtract(deposit.getPenaltyAmount());
                            if (effectiveDeposit.compareTo(BigDecimal.ZERO) <= 0) continue;

                            processedDepositIds.add(deposit.getId());
                            paymentRepository.save(Payment.builder()
                                    .invoice(invoice)
                                    .amount(effectiveDeposit)
                                    .method(deposit.getPaymentMethod() != null ? deposit.getPaymentMethod() : PaymentMethod.CASH)
                                    .paidAt(deposit.getCollectedAt() != null ? deposit.getCollectedAt() : LocalDateTime.now())
                                    .collectedBy(deposit.getCollectedBy() != null ? deposit.getCollectedBy() : actor)
                                    .note("Trừ tiền đặt cọc đoàn đã thu (Mã cọc #" + deposit.getId() + ", đoàn #" + invoice.getGroupBooking().getId() + ")")
                                    .build());
                        }
                    } else {
                        // Tách: phân bổ cọc đoàn cho invoice này theo tỷ lệ tiền phòng
                        // Lấy tổng tiền phòng của tất cả active bookings trong đoàn
                        List<Booking> allActiveBookings = bookingRepository.findByGroupBookingId(invoice.getGroupBooking().getId())
                                .stream()
                                .filter(b -> b.getStatus() != BookingStatus.CANCELLED && b.getStatus() != BookingStatus.NO_SHOW)
                                .collect(Collectors.toList());
                        BigDecimal totalActiveRoomAmount = allActiveBookings.stream()
                                .map(this::roomAmountFor)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        // Tỷ lệ cọc cho invoice này dựa trên tiền phòng của booking đại diện
                        BigDecimal invoiceRoomAmount = invoice.getRoomAmount();
                        BigDecimal allocatedDeposit = BigDecimal.ZERO;
                        if (totalActiveRoomAmount.compareTo(BigDecimal.ZERO) > 0) {
                            allocatedDeposit = totalGroupDeposit
                                    .multiply(invoiceRoomAmount)
                                    .divide(totalActiveRoomAmount, 0, java.math.RoundingMode.HALF_UP);
                        }
                        if (allocatedDeposit.compareTo(BigDecimal.ZERO) > 0) {
                            paymentRepository.save(Payment.builder()
                                    .invoice(invoice)
                                    .amount(allocatedDeposit)
                                    .method(PaymentMethod.CASH)
                                    .paidAt(LocalDateTime.now())
                                    .collectedBy(actor)
                                    .note("Phân bổ cọc đoàn #" + invoice.getGroupBooking().getId()
                                            + " theo tỷ lệ phòng (" + invoiceRoomAmount + "/" + totalActiveRoomAmount + ")")
                                    .build());
                        }
                    }
                }
            }
        }
    }

    private GroupBooking findGroupBooking(Long groupBookingId) {
        return groupBookingRepository.findById(groupBookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ đặt phòng đoàn"));
    }

    private GroupInvoiceResponse toGroupResponse(Long groupBookingId, List<Invoice> invoices) {
        // Only consider non-cancelled invoices for financial totals
        List<Invoice> activeInvoices = invoices.stream()
                .filter(inv -> inv.getStatus() != InvoiceStatus.ADJUSTED)
                .collect(Collectors.toList());

        BigDecimal roomAmount = activeInvoices.stream()
                .map(inv -> inv.getRoomAmount() != null ? inv.getRoomAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal serviceAmount = activeInvoices.stream()
                .map(inv -> inv.getServiceAmount() != null ? inv.getServiceAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal discountAmount = activeInvoices.stream()
                .map(inv -> inv.getDiscountAmount() != null ? inv.getDiscountAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalAmount = activeInvoices.stream()
                .map(inv -> inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paidAmount = activeInvoices.stream().flatMap(invoice -> paymentRepository.findByInvoiceId(invoice.getId()).stream())
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        // Tổng cọc đoàn đã thu (hiển thị riêng cho lễ tân biết)
        BigDecimal totalGroupDeposit = depositRepository.findByGroupBookingIdOrderByCreatedAtDesc(groupBookingId).stream()
                .filter(d -> d.getStatus() == DepositStatus.COLLECTED || d.getStatus() == DepositStatus.SHORT_PAID)
                .map(d -> {
                    BigDecimal eff = d.getCollectedAmount() != null ? d.getCollectedAmount() : BigDecimal.ZERO;
                    if (d.getRefundedAmount() != null) eff = eff.subtract(d.getRefundedAmount());
                    if (d.getPenaltyAmount() != null) eff = eff.subtract(d.getPenaltyAmount());
                    return eff.max(BigDecimal.ZERO);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // canReset: cho phép đặt lại hóa đơn khi chưa có invoice PAID nào
        boolean canReset = !activeInvoices.isEmpty()
                && activeInvoices.stream().noneMatch(inv -> inv.getStatus() == InvoiceStatus.PAID);

        // P1.5: Ghi nhớ mode gần nhất của người đại diện đoàn
        InvoiceMode suggestedMode = null;
        if (activeInvoices.isEmpty()) {
            GroupBooking gb = findGroupBooking(groupBookingId);
            if (gb.getRepresentativeGuest() != null) {
                List<GroupBooking> prevGroups = groupBookingRepository.findByRepresentativeGuestId(gb.getRepresentativeGuest().getId());
                for (GroupBooking prev : prevGroups) {
                    if (!prev.getId().equals(groupBookingId)) {
                        List<Invoice> prevInvoices = invoiceRepository.findByGroupBookingIdOrderByIdAsc(prev.getId());
                        if (!prevInvoices.isEmpty() && prevInvoices.get(0).getStatus() != InvoiceStatus.ADJUSTED) {
                            suggestedMode = prevInvoices.get(0).getMode();
                            break;
                        }
                    }
                }
            }
        }

        return GroupInvoiceResponse.builder()
                .groupBookingId(groupBookingId)
                .mode(activeInvoices.isEmpty() ? null : activeInvoices.get(0).getMode())
                .suggestedMode(suggestedMode != null ? suggestedMode : InvoiceMode.COMBINED)
                .roomAmount(roomAmount)
                .serviceAmount(serviceAmount)
                .discountAmount(discountAmount)
                .totalAmount(totalAmount)
                .paidAmount(paidAmount)
                .outstandingAmount(totalAmount.subtract(paidAmount).max(BigDecimal.ZERO))
                .invoices(activeInvoices.stream().map(this::toResponse).collect(Collectors.toList()))
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
        if (invoice == null || invoice.getStatus() == InvoiceStatus.ADJUSTED) {
            return invoice;
        }

        List<Payment> currentPayments = paymentRepository.findByInvoiceId(invoice.getId());
        boolean hasDepositRefund = currentPayments.stream().anyMatch(p -> p.getAmount().compareTo(BigDecimal.ZERO) < 0);

        // 1. Đối soát cọc cho booking đơn lẻ
        if (invoice.getBooking() != null) {
            List<Deposit> deposits = depositRepository.findByBookingIdOrderByCreatedAtDesc(invoice.getBooking().getId());

            for (Deposit d : deposits) {
                // Tính cọc hiệu lực thực tế còn lại
                BigDecimal effectiveDeposit = BigDecimal.ZERO;
                if (d.getStatus() == DepositStatus.COLLECTED || d.getStatus() == DepositStatus.SHORT_PAID) {
                    BigDecimal collected = d.getCollectedAmount() != null ? d.getCollectedAmount() : BigDecimal.ZERO;
                    BigDecimal refunded = d.getRefundedAmount() != null ? d.getRefundedAmount() : BigDecimal.ZERO;
                    BigDecimal penalty = d.getPenaltyAmount() != null ? d.getPenaltyAmount() : BigDecimal.ZERO;
                    effectiveDeposit = collected.subtract(refunded).subtract(penalty).max(BigDecimal.ZERO);
                }

                // Tính tổng các lượt trừ/hoàn cọc hiện có trên invoice đối với khoản cọc này
                BigDecimal netDepositPaidOnInvoice = currentPayments.stream()
                        .filter(p -> p.getNote() != null && (
                                p.getNote().contains("Mã cọc #" + d.getId()) ||
                                (deposits.size() == 1 && (p.getNote().contains("đặt cọc") || p.getNote().contains("cọc") || p.getNote().contains("Deposit")))
                        ))
                        .map(Payment::getAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (netDepositPaidOnInvoice.compareTo(effectiveDeposit) < 0) {
                    // Cần bù thêm lượt khấu trừ cọc
                    BigDecimal diff = effectiveDeposit.subtract(netDepositPaidOnInvoice);
                    if (diff.compareTo(BigDecimal.ZERO) > 0) {
                        Payment depositPayment = Payment.builder()
                                .invoice(invoice)
                                .amount(diff)
                                .method(d.getPaymentMethod() != null ? d.getPaymentMethod() : PaymentMethod.CASH)
                                .paidAt(d.getCollectedAt() != null ? d.getCollectedAt() : LocalDateTime.now())
                                .collectedBy(d.getCollectedBy() != null ? d.getCollectedBy() : invoice.getCreatedBy())
                                .note("Trừ tiền đặt cọc đã thu (Mã cọc #" + d.getId() + ")")
                                .build();
                        paymentRepository.save(depositPayment);
                    }
                } else if (netDepositPaidOnInvoice.compareTo(effectiveDeposit) > 0) {
                    // Đã hoàn cọc hoặc phạt cọc -> ghi nhận lượt hoàn tiền âm
                    BigDecimal excess = netDepositPaidOnInvoice.subtract(effectiveDeposit);
                    Payment refundPayment = Payment.builder()
                            .invoice(invoice)
                            .amount(excess.negate())
                            .method(d.getPaymentMethod() != null ? d.getPaymentMethod() : PaymentMethod.CASH)
                            .paidAt(d.getProcessedAt() != null ? d.getProcessedAt() : LocalDateTime.now())
                            .collectedBy(d.getProcessedBy() != null ? d.getProcessedBy() : invoice.getCreatedBy())
                            .note("Hoàn trả tiền cọc đã khấu trừ (Mã cọc #" + d.getId() + ")")
                            .build();
                    paymentRepository.save(refundPayment);
                    hasDepositRefund = true;
                }
            }
        }

        // 2. Tính lại tổng đã thanh toán sau khi đồng bộ
        BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. Cập nhật trạng thái hóa đơn phù hợp (không can thiệp nếu PENDING_DISCOUNT_APPROVAL hoặc ADJUSTED)
        if (invoice.getStatus() != InvoiceStatus.PENDING_DISCOUNT_APPROVAL && invoice.getStatus() != InvoiceStatus.ADJUSTED) {
            if (invoice.getStatus() == InvoiceStatus.PENDING || invoice.getStatus() == InvoiceStatus.PENDING_PAYMENT) {
                if (totalPaid.compareTo(invoice.getTotalAmount()) >= 0) {
                    invoice.setStatus(InvoiceStatus.PAID);
                    invoice = invoiceRepository.save(invoice);
                }
            } else if (invoice.getStatus() == InvoiceStatus.PAID) {
                if (hasDepositRefund && totalPaid.compareTo(invoice.getTotalAmount()) < 0) {
                    invoice.setStatus(InvoiceStatus.PENDING);
                    invoice = invoiceRepository.save(invoice);
                }
            }
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
