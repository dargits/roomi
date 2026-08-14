package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.InvoiceAdjustRequest;
import plant.stay.dto.request.PaymentRequest;
import plant.stay.dto.response.InvoiceResponse;
import plant.stay.dto.response.PaymentResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.InvoiceService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final BookingRepository bookingRepository;
    private final BookingServiceUsageRepository usageRepository;
    private final PaymentRepository paymentRepository;
    private final AuditLogService auditLogService;

    @Override
    public InvoiceResponse getByBooking(Long bookingId) {
        return invoiceRepository.findByBookingId(bookingId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có hóa đơn cho booking này"));
    }

    @Override
    public InvoiceResponse getById(Long invoiceId) {
        return toResponse(findById(invoiceId));
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
        auditLogService.log("Invoice", invoice.getId(), "CREATE", actor,
                "Lập hóa đơn cho booking #" + bookingId);
        return toResponse(invoice);
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

    private Invoice findById(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn"));
    }

    private InvoiceResponse toResponse(Invoice inv) {
        return InvoiceResponse.builder()
                .id(inv.getId())
                .bookingId(inv.getBooking().getId())
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
