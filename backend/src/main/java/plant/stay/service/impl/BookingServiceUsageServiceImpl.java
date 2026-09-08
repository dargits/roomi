package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.BookingServiceUsageRequest;
import plant.stay.dto.response.BookingServiceUsageResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.BookingServiceUsageService;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingServiceUsageServiceImpl implements BookingServiceUsageService {

    private final BookingServiceUsageRepository usageRepository;
    private final BookingRepository bookingRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final AuditLogService auditLogService;
    private final InvoiceRepository invoiceRepository;

    @Override
    public List<BookingServiceUsageResponse> getByBooking(Long bookingId) {
        return usageRepository.findByBookingId(bookingId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BookingServiceUsageResponse add(Long bookingId, BookingServiceUsageRequest request, User actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt phòng"));
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể thêm dịch vụ cho booking đang ở trạng thái CHECKED_IN");
        }
        ExtraService service = extraServiceRepository.findById(request.getExtraServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ"));
        if (!service.isActive()) {
            throw new IllegalArgumentException("Dịch vụ '" + service.getName() + "' hiện không hoạt động");
        }
        
        invoiceRepository.findByBookingId(bookingId).ifPresent(invoice -> {
            if (invoice.getStatus() == InvoiceStatus.PAID) {
                throw new IllegalArgumentException("Không thể thêm dịch vụ vì hóa đơn đã được thanh toán");
            }
        });

        BookingServiceUsage usage = BookingServiceUsage.builder()
                .booking(booking)
                .extraService(service)
                .quantity(request.getQuantity())
                .unitPriceSnapshot(service.getUnitPrice()) // snapshot giá tại thời điểm ghi nhận
                .build();
        usage = usageRepository.save(usage);
        auditLogService.log("BookingServiceUsage", usage.getId(), "ADD_SERVICE", actor,
                "Thêm dịch vụ " + service.getName() + " x" + request.getQuantity());
        
        syncPendingInvoice(bookingId);
        
        return toResponse(usage);
    }

    @Override
    @Transactional
    public MessageResponse remove(Long bookingId, Long usageId, User actor) {
        BookingServiceUsage usage = usageRepository.findById(usageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dòng dịch vụ"));
        if (!usage.getBooking().getId().equals(bookingId)) {
            throw new IllegalArgumentException("Dịch vụ không thuộc booking này");
        }
        if (usage.getBooking().getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể xóa dịch vụ cho booking đang ở trạng thái CHECKED_IN");
        }
        
        String serviceName = usage.getExtraService().getName();
        
        invoiceRepository.findByBookingId(bookingId).ifPresent(invoice -> {
            if (invoice.getStatus() == InvoiceStatus.PAID) {
                throw new IllegalArgumentException("Không thể xóa dịch vụ vì hóa đơn đã được thanh toán");
            }
        });
        
        usageRepository.delete(usage);
        auditLogService.log("BookingServiceUsage", usageId, "REMOVE_SERVICE", actor,
                "Xóa dịch vụ " + serviceName + " khỏi booking #" + bookingId);
        
        syncPendingInvoice(bookingId);
        
        return new MessageResponse("Đã xóa dịch vụ " + serviceName);
    }

    private BookingServiceUsageResponse toResponse(BookingServiceUsage u) {
        BigDecimal total = u.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(u.getQuantity()));
        return BookingServiceUsageResponse.builder()
                .id(u.getId())
                .bookingId(u.getBooking().getId())
                .extraServiceId(u.getExtraService().getId())
                .serviceName(u.getExtraService().getName())
                .quantity(u.getQuantity())
                .unitPriceSnapshot(u.getUnitPriceSnapshot())
                .total(total)
                .createdAt(u.getCreatedAt())
                .build();
    }

    private void syncPendingInvoice(Long bookingId) {
        invoiceRepository.findByBookingId(bookingId).ifPresent(invoice -> {
            if (invoice.getStatus() == InvoiceStatus.PENDING) {
                List<BookingServiceUsage> usages = usageRepository.findByBookingId(bookingId);
                BigDecimal serviceAmount = usages.stream()
                        .map(u -> u.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(u.getQuantity())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                invoice.setServiceAmount(serviceAmount);
                
                BigDecimal totalAmount = invoice.getRoomAmount()
                        .add(serviceAmount)
                        .subtract(invoice.getDiscountAmount() != null ? invoice.getDiscountAmount() : BigDecimal.ZERO);
                invoice.setTotalAmount(totalAmount);
                invoiceRepository.save(invoice);
            }
        });
    }
}
