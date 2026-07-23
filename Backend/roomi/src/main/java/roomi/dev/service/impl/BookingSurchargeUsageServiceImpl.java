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

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingSurchargeUsageServiceImpl implements BookingSurchargeUsageService {
    private final BookingRepository bookingRepository;
    private final BookingSurchargeUsageRepository usageRepository;
    private final SurchargeServiceRepository surchargeServiceRepository;
    private final InvoiceRepository invoiceRepository;

    @Override
    @Transactional
    public BookingSurchargeUsageResponse create(Long bookingId, BookingSurchargeUsageRequest request, User currentUser) {
        requireUsageManager(currentUser);
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
        requireUsageManager(currentUser);
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
        requireUsageManager(currentUser);
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
        requireUsageManager(currentUser);
        findBooking(bookingId);
        return usageRepository.findByBookingIdOrderByRecordedAtAscIdAsc(bookingId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public InvoiceResponse getInvoice(Long bookingId, User currentUser) {
        requireUsageManager(currentUser);
        Booking booking = findBooking(bookingId);
        Invoice invoice = recalculateInvoice(booking);
        List<BookingSurchargeUsageResponse> usages = usageRepository
                .findByBookingIdOrderByRecordedAtAscIdAsc(bookingId)
                .stream()
                .map(this::toResponse)
                .toList();
        return toInvoiceResponse(invoice, usages);
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
        invoice.setRoomCharge(roomCharge);
        invoice.setServiceCharge(serviceCharge);
        invoice.setDiscount(discount);
        invoice.setTotalAmount(roomCharge.add(serviceCharge).subtract(discount));
        return invoiceRepository.save(invoice);
    }

    private void requireUnpaidInvoice(Long bookingId) {
        invoiceRepository.findByBookingId(bookingId)
                .filter(invoice -> invoice.getStatus() == Invoice.Status.PAID)
                .ifPresent(invoice -> {
                    throw new BusinessException("Hóa đơn đã thanh toán, không thể thay đổi phát sinh", ErrorCode.INVOICE_PAID);
                });
    }

    private void requireMutableBooking(Booking booking) {
        if (booking.getStatus() != Booking.Status.CHECKED_IN && booking.getStatus() != Booking.Status.CHECKED_OUT) {
            throw new BusinessException("Chỉ có thể điều chỉnh dịch vụ khi booking đang lưu trú hoặc đã trả phòng", ErrorCode.BOOKING_INVALID_STATUS);
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

    private void requireUsageManager(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getActive())
                || (user.getRole() != User.Role.OWNER && user.getRole() != User.Role.RECEPTIONIST)) {
            throw new BusinessException("Bạn không có quyền ghi nhận dịch vụ phụ thu", ErrorCode.INSUFFICIENT_PRIVILEGES);
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
        return InvoiceResponse.builder()
                .id(invoice.getId())
                .bookingId(invoice.getBooking().getId())
                .roomCharge(invoice.getRoomCharge())
                .serviceCharge(invoice.getServiceCharge())
                .discount(invoice.getDiscount())
                .totalAmount(invoice.getTotalAmount())
                .status(invoice.getStatus().name())
                .createdAt(invoice.getCreatedAt())
                .serviceUsages(usages)
                .build();
    }
}
