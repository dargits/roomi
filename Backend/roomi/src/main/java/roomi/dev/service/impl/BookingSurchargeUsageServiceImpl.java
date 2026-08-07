package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.dto.request.BookingSurchargeUsageRequest;
import roomi.dev.dto.response.BookingSurchargeUsageResponse;
import roomi.dev.dto.response.InvoiceResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Booking;
import roomi.dev.model.BookingSurchargeUsage;
import roomi.dev.model.Invoice;
import roomi.dev.model.SurchargeService;
import roomi.dev.model.User;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.BookingSurchargeUsageRepository;
import roomi.dev.repository.InvoiceRepository;
import roomi.dev.repository.SurchargeServiceRepository;
import roomi.dev.service.BookingSurchargeUsageService;
import roomi.dev.dto.response.PaymentResponse;
import roomi.dev.model.Payment;
import roomi.dev.repository.PaymentRepository;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingSurchargeUsageServiceImpl implements BookingSurchargeUsageService {
    private final BookingRepository bookingRepository;
    private final BookingSurchargeUsageRepository usageRepository;
    private final SurchargeServiceRepository surchargeServiceRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    @Override
    @Transactional
    public BookingSurchargeUsageResponse create(Long bookingId, BookingSurchargeUsageRequest request, User currentUser) {
        requireUsageWriter(currentUser);
        Booking booking = findBooking(bookingId);
        requireBookingAllowsUsageCreation(booking);

        SurchargeService service = findActiveService(request.getSurchargeServiceId());
        BookingSurchargeUsage usage = BookingSurchargeUsage.builder()
                .booking(booking)
                .surchargeService(service)
                .serviceName(service.getName())
                .unitPrice(service.getUnitPrice())
                .quantity(request.getQuantity())
                .lineTotal(calculateLineTotal(service.getUnitPrice(), request.getQuantity()))
                .note(normalizeOptional(request.getNote()))
                .recordedBy(currentUser)
                .build();
        BookingSurchargeUsage saved = usageRepository.save(usage);
        recalculateInvoice(booking);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public BookingSurchargeUsageResponse update(Long bookingId, Long usageId,
                                                 BookingSurchargeUsageRequest request, User currentUser) {
        requireUsageWriter(currentUser);
        Booking booking = findBooking(bookingId);
        requireMutableBooking(booking);
        BookingSurchargeUsage usage = findUsage(usageId);
        requireUsageBelongsToBooking(usage, bookingId);
        requireUnpaidInvoice(bookingId);

        if (!usage.getSurchargeService().getId().equals(request.getSurchargeServiceId())) {
            SurchargeService service = findActiveService(request.getSurchargeServiceId());
            usage.setSurchargeService(service);
            usage.setServiceName(service.getName());
            usage.setUnitPrice(service.getUnitPrice());
        }
        usage.setQuantity(request.getQuantity());
        usage.setLineTotal(calculateLineTotal(usage.getUnitPrice(), request.getQuantity()));
        usage.setNote(normalizeOptional(request.getNote()));
        BookingSurchargeUsage saved = usageRepository.save(usage);
        recalculateInvoice(booking);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long bookingId, Long usageId, User currentUser) {
        requireUsageWriter(currentUser);
        Booking booking = findBooking(bookingId);
        requireMutableBooking(booking);
        requireUnpaidInvoice(bookingId);
        BookingSurchargeUsage usage = findUsage(usageId);
        requireUsageBelongsToBooking(usage, bookingId);
        usageRepository.delete(usage);
        recalculateInvoice(booking);
    }

    @Override
    public List<BookingSurchargeUsageResponse> getByBookingId(Long bookingId, User currentUser) {
        requireUsageWriter(currentUser);
        findBooking(bookingId);
        return usageRepository.findByBookingIdOrderByRecordedAtAscIdAsc(bookingId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public InvoiceResponse getInvoice(Long bookingId, User currentUser) {
        // ACCOUNTANT được phép xem hóa đơn để đối soát (VT-04)
        requireInvoiceViewer(currentUser);
        Booking booking = findBooking(bookingId);
        requireReceptionistShift(booking, currentUser);
        Invoice invoice = recalculateInvoice(booking);
        List<BookingSurchargeUsageResponse> usages = usageRepository
                .findByBookingIdOrderByRecordedAtAscIdAsc(bookingId)
                .stream()
                .map(this::toResponse)
                .toList();
        return toInvoiceResponse(invoice, usages);
    }

    @Override
    @Transactional
    public InvoiceResponse createAdjustmentInvoice(Long bookingId, roomi.dev.dto.request.InvoiceAdjustmentRequest request, User currentUser) {
        requireAdjustmentInvoiceCreator(currentUser);
        Booking booking = findBooking(bookingId);
        Invoice originalInvoice = invoiceRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BusinessException("Chưa có hóa đơn cho booking này", ErrorCode.INVOICE_NOT_FOUND));

        // RISK-03: Hóa đơn gốc phải đã được PAID mới được lập hóa đơn điều chỉnh
        // Đúng AC NCL-05-CN-004-TC-02
        if (originalInvoice.getStatus() != Invoice.Status.PAID) {
            throw new BusinessException(
                    "Hóa đơn gốc chưa được thanh toán (đang ở trạng thái PENDING). " +
                    "Chỉ lập hóa đơn điều chỉnh sau khi đã thanh toán đủ.",
                    ErrorCode.INVOICE_UNPAID);
        }

        BigDecimal roomAdj = request.getRoomChargeAdjustment() != null ? request.getRoomChargeAdjustment() : BigDecimal.ZERO;
        BigDecimal serviceAdj = request.getServiceChargeAdjustment() != null ? request.getServiceChargeAdjustment() : BigDecimal.ZERO;
        BigDecimal discountAdj = request.getDiscountAdjustment() != null ? request.getDiscountAdjustment() : BigDecimal.ZERO;
        BigDecimal totalAdj = roomAdj.add(serviceAdj).subtract(discountAdj);

        Invoice adjustmentInvoice = Invoice.builder()
                .booking(booking)
                .originalInvoice(originalInvoice)
                .adjustmentReason(request.getAdjustmentReason().trim())
                .roomCharge(roomAdj)
                .serviceCharge(serviceAdj)
                .discount(discountAdj)
                .totalAmount(totalAdj)
                .status(Invoice.Status.PENDING)
                .build();

        Invoice saved = invoiceRepository.save(adjustmentInvoice);
        List<BookingSurchargeUsageResponse> usages = usageRepository
                .findByBookingIdOrderByRecordedAtAscIdAsc(bookingId)
                .stream()
                .map(this::toResponse)
                .toList();

        return toInvoiceResponse(saved, usages);
    }

    @Override
    @Transactional
    public InvoiceResponse updateInvoice(Long bookingId, roomi.dev.dto.request.UpdateInvoiceRequest request, User currentUser) {
        requireInvoiceViewer(currentUser);
        Booking booking = findBooking(bookingId);
        requireReceptionistShift(booking, currentUser);
        Invoice invoice = invoiceRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BusinessException("Chưa có hóa đơn cho booking này", ErrorCode.INVOICE_NOT_FOUND));

        if (invoice.getStatus() == Invoice.Status.PAID) {
            throw new BusinessException("Hóa đơn đã thanh toán, không thể chỉnh sửa trực tiếp", ErrorCode.INVOICE_PAID);
        }

        BigDecimal roomCharge = defaultValue(booking.getExpectedPrice());
        BigDecimal serviceCharge = defaultValue(usageRepository.sumLineTotalByBookingId(booking.getId()));
        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;

        // RISK-08: Kiểm tra giảm giá không vượt quá tổng tiền
        BigDecimal subtotal = roomCharge.add(serviceCharge);
        if (discount.compareTo(subtotal) > 0) {
            throw new BusinessException(
                    "Giảm giá (" + discount + " VNĐ) không được vượt quá tổng tiền (" + subtotal + " VNĐ).",
                    ErrorCode.INVALID_INPUT);
        }

        invoice.setDiscount(discount);
        invoice.setRoomCharge(roomCharge);
        invoice.setServiceCharge(serviceCharge);
        invoice.setTotalAmount(subtotal.subtract(discount));

        Invoice saved = invoiceRepository.save(invoice);
        List<BookingSurchargeUsageResponse> usages = usageRepository
                .findByBookingIdOrderByRecordedAtAscIdAsc(bookingId)
                .stream()
                .map(this::toResponse)
                .toList();

        return toInvoiceResponse(saved, usages);
    }

    private Invoice recalculateInvoice(Booking booking) {
        Invoice invoice = invoiceRepository.findByBookingId(booking.getId())
                .orElseGet(() -> Invoice.builder()
                        .booking(booking)
                        .roomCharge(BigDecimal.ZERO)
                        .serviceCharge(BigDecimal.ZERO)
                        .discount(BigDecimal.ZERO)
                        .totalAmount(BigDecimal.ZERO)
                        .status(Invoice.Status.PENDING)
                        .build());
        if (invoice.getStatus() == Invoice.Status.PAID) {
            return invoice;
        }

        BigDecimal roomCharge = defaultValue(booking.getExpectedPrice());
        BigDecimal serviceCharge = defaultValue(usageRepository.sumLineTotalByBookingId(booking.getId()));
        BigDecimal discount = defaultValue(invoice.getDiscount());

        // RISK-08: Không cho phép giảm giá vượt quá tổng tiền
        BigDecimal subtotal = roomCharge.add(serviceCharge);
        if (discount.compareTo(subtotal) > 0) {
            throw new BusinessException(
                    "Giảm giá (" + discount + " VNĐ) không được vượt quá tổng tiền (" + subtotal + " VNĐ).",
                    ErrorCode.INVALID_INPUT);
        }

        invoice.setRoomCharge(roomCharge);
        invoice.setServiceCharge(serviceCharge);
        invoice.setDiscount(discount);
        invoice.setTotalAmount(subtotal.subtract(discount));
        return invoiceRepository.save(invoice);
    }

    private void requireUnpaidInvoice(Long bookingId) {
        invoiceRepository.findByBookingId(bookingId)
                .filter(invoice -> invoice.getStatus() == Invoice.Status.PAID)
                .ifPresent(invoice -> {
                    throw new BusinessException("Hóa đơn đã thanh toán, không thể thay đổi phát sinh", ErrorCode.INVOICE_PAID);
                });
    }

    /**
     * RISK-06 FIX: Thống nhất điều kiện chỉnh sửa dịch vụ phụ thu.
     * Cho phép thao tác khi booking ở NEW, CONFIRMED hoặc CHECKED_IN.
     * Chỉ khóa khi hóa đơn đã PAID (kiểm tra qua requireUnpaidInvoice).
     * Lý do: nếu lễ tân đã thêm dịch vụ khi booking còn NEW/CONFIRMED, họ cần
     * có quyền sửa/xóa dịch vụ đó trước khi khách check-in.
     */
    private void requireMutableBooking(Booking booking) {
        if (booking.getStatus() == Booking.Status.CHECKED_OUT
                || booking.getStatus() == Booking.Status.CANCELLED
                || booking.getStatus() == Booking.Status.NO_SHOW) {
            throw new BusinessException(
                    "Không thể điều chỉnh dịch vụ cho booking đã kết thúc (" + booking.getStatus() + ")",
                    ErrorCode.BOOKING_INVALID_STATUS);
        }
    }

    private void requireBookingAllowsUsageCreation(Booking booking) {
        if (booking.getStatus() != Booking.Status.NEW
                && booking.getStatus() != Booking.Status.CONFIRMED
                && booking.getStatus() != Booking.Status.CHECKED_IN) {
            throw new BusinessException(
                    "Chỉ có thể thêm dịch vụ cho booking mới, đã xác nhận hoặc đang lưu trú",
                    ErrorCode.BOOKING_INVALID_STATUS);
        }
    }

    /**
     * Kiểm tra quyền ghi nhận / sửa / xóa dịch vụ phụ thu.
     * Roles được phép: OWNER, ADMIN, RECEPTIONIST.
     */
    private void requireUsageWriter(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getActive())
                || (user.getRole() != User.Role.OWNER
                && user.getRole() != User.Role.ADMIN
                && user.getRole() != User.Role.RECEPTIONIST)) {
            throw new BusinessException("Bạn không có quyền ghi nhận dịch vụ phụ thu", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }
    }

    /**
     * Kiểm tra quyền lập hóa đơn điều chỉnh.
     * Roles được phép: OWNER, ADMIN, ACCOUNTANT.
     */
    private void requireAdjustmentInvoiceCreator(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getActive())
                || (user.getRole() != User.Role.OWNER
                && user.getRole() != User.Role.ADMIN
                && user.getRole() != User.Role.ACCOUNTANT)) {
            throw new BusinessException("Bạn không có quyền lập hóa đơn điều chỉnh", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }
    }

    private void requireReceptionistShift(Booking booking, User user) {
        // Tất cả lễ tân đều có quyền thao tác dịch vụ phụ thu cho các đơn trong khách sạn
    }

    /**
     * Kiểm tra quyền xem hóa đơn.
     * Roles được phép: OWNER, ADMIN, RECEPTIONIST, ACCOUNTANT (VT-04 — kế toán đối soát).
     */
    private void requireInvoiceViewer(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getActive())
                || (user.getRole() != User.Role.OWNER
                && user.getRole() != User.Role.ADMIN
                && user.getRole() != User.Role.RECEPTIONIST
                && user.getRole() != User.Role.ACCOUNTANT)) {
            throw new BusinessException("Bạn không có quyền xem hóa đơn", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }
    }

    private Booking findBooking(Long bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy booking", ErrorCode.BOOKING_NOT_FOUND));
    }

    private BookingSurchargeUsage findUsage(Long usageId) {
        return usageRepository.findById(usageId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phát sinh dịch vụ", ErrorCode.SURCHARGE_USAGE_NOT_FOUND));
    }

    private SurchargeService findActiveService(Long serviceId) {
        SurchargeService service = surchargeServiceRepository.findById(serviceId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy dịch vụ phụ thu", ErrorCode.SURCHARGE_SERVICE_NOT_FOUND));
        if (!Boolean.TRUE.equals(service.getActive())) {
            throw new BusinessException("Dịch vụ phụ thu đã ngừng hoạt động", ErrorCode.SURCHARGE_SERVICE_INACTIVE);
        }
        return service;
    }

    private void requireUsageBelongsToBooking(BookingSurchargeUsage usage, Long bookingId) {
        if (!usage.getBooking().getId().equals(bookingId)) {
            throw new BusinessException("Phát sinh dịch vụ không thuộc booking này", ErrorCode.SURCHARGE_USAGE_NOT_FOUND);
        }
    }

    private BigDecimal calculateLineTotal(BigDecimal unitPrice, Integer quantity) {
        return unitPrice.multiply(BigDecimal.valueOf(quantity.longValue()));
    }

    private BigDecimal defaultValue(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private BookingSurchargeUsageResponse toResponse(BookingSurchargeUsage usage) {
        return BookingSurchargeUsageResponse.builder()
                .id(usage.getId())
                .bookingId(usage.getBooking().getId())
                .surchargeServiceId(usage.getSurchargeService().getId())
                .serviceName(usage.getServiceName())
                .unitPrice(usage.getUnitPrice())
                .quantity(usage.getQuantity())
                .lineTotal(usage.getLineTotal())
                .note(usage.getNote())
                .recordedById(usage.getRecordedBy().getId())
                .recordedByName(usage.getRecordedBy().getFullName())
                .recordedAt(usage.getRecordedAt())
                .build();
    }

    private InvoiceResponse toInvoiceResponse(Invoice invoice, List<BookingSurchargeUsageResponse> usages) {
        List<Payment> payments = paymentRepository.findByInvoiceId(invoice.getId());
        List<PaymentResponse> paymentResponses = payments.stream()
                .map(p -> PaymentResponse.builder()
                        .id(p.getId())
                        .invoiceId(p.getInvoice().getId())
                        .amount(p.getAmount())
                        .method(p.getMethod().name())
                        .receivedById(p.getReceivedBy() != null ? p.getReceivedBy().getId() : null)
                        .receivedByName(p.getReceivedBy() != null ? p.getReceivedBy().getFullName() : null)
                        .paidAt(p.getPaidAt())
                        .build())
                .toList();

        BigDecimal totalPaid = payments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remainingAmount = invoice.getTotalAmount().subtract(totalPaid);
        if (remainingAmount.compareTo(BigDecimal.ZERO) < 0) {
            remainingAmount = BigDecimal.ZERO;
        }

        return InvoiceResponse.builder()
                .id(invoice.getId())
                .bookingId(invoice.getBooking().getId())
                .roomCharge(invoice.getRoomCharge())
                .serviceCharge(invoice.getServiceCharge())
                .discount(invoice.getDiscount())
                .totalAmount(invoice.getTotalAmount())
                .totalPaid(totalPaid)
                .remainingAmount(remainingAmount)
                .status(invoice.getStatus().name())
                .createdAt(invoice.getCreatedAt())
                .serviceUsages(usages)
                .payments(paymentResponses)
                .build();
    }
}
