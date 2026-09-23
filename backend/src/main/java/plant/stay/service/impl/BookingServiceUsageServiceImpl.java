package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.ExtraServiceInventoryItemDto;
import plant.stay.dto.request.BookingServiceUsageRequest;
import plant.stay.dto.response.BookingServiceUsageResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.BookingServiceUsageService;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingServiceUsageServiceImpl implements BookingServiceUsageService {

    private final BookingServiceUsageRepository usageRepository;
    private final BookingRepository bookingRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final ExtraServiceInventoryItemRepository extraServiceInventoryItemRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final AuditLogService auditLogService;
    private final InvoiceRepository invoiceRepository;
    private final plant.stay.service.RoomStayGuestService roomStayGuestService;

    @Override
    @Transactional
    public List<BookingServiceUsageResponse> getByBooking(Long bookingId) {
        try {
            roomStayGuestService.syncBookingSurcharges(bookingId, null);
        } catch (Exception ignored) {
        }
        List<BookingServiceUsage> usages = usageRepository.findByBookingId(bookingId);
        if (usages.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> serviceIds = usages.stream()
                .filter(u -> u.getExtraService() != null)
                .map(u -> u.getExtraService().getId())
                .distinct()
                .collect(Collectors.toList());

        Map<Long, List<ExtraServiceInventoryItem>> serviceItemsMap = extraServiceInventoryItemRepository
                .findByExtraServiceIdIn(serviceIds).stream()
                .collect(Collectors.groupingBy(item -> item.getExtraService().getId()));

        return usages.stream()
                .map(u -> toResponseWithItems(u, serviceItemsMap.getOrDefault(
                        u.getExtraService() != null ? u.getExtraService().getId() : null,
                        Collections.emptyList()
                )))
                .collect(Collectors.toList());
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
        
        if (service.getName().contains("ở ghép") || service.getName().contains("vượt tiêu chuẩn")) {
            throw new IllegalArgumentException("Dịch vụ phụ thu người ở ghép được hệ thống tự động ghi nhận khi thêm khách cùng phòng, không thể thêm thủ công!");
        }
        
        invoiceRepository.findByBookingId(bookingId).ifPresent(invoice -> {
            if (invoice.getStatus() == InvoiceStatus.PAID) {
                throw new IllegalArgumentException("Không thể thêm dịch vụ vì hóa đơn đã được thanh toán");
            }
        });

        // 1. Kiểm tra định mức tiêu hao kho đồ dùng và kiểm tra tồn kho
        List<ExtraServiceInventoryItem> linkedItems = extraServiceInventoryItemRepository.findByExtraServiceId(service.getId());
        int serviceQty = (request.getQuantity() != null && request.getQuantity() > 0) ? request.getQuantity() : 1;

        for (ExtraServiceInventoryItem link : linkedItems) {
            InventoryItem invItem = link.getInventoryItem();
            int requiredQty = link.getQuantity() * serviceQty;
            int onHand = invItem.getQuantityOnHand() != null ? invItem.getQuantityOnHand() : 0;
            if (onHand < requiredQty) {
                throw new IllegalArgumentException("Không đủ tồn kho cho mặt hàng '" + invItem.getName() +
                        "'. Tồn kho hiện có: " + onHand + " " + invItem.getUnit() +
                        ", Cần xuất: " + requiredQty + " " + invItem.getUnit());
            }
        }

        // 2. Thực hiện trừ tồn kho và ghi nhật ký
        for (ExtraServiceInventoryItem link : linkedItems) {
            InventoryItem invItem = link.getInventoryItem();
            int deductQty = link.getQuantity() * serviceQty;
            invItem.setQuantityOnHand(invItem.getQuantityOnHand() - deductQty);
            inventoryItemRepository.save(invItem);

            auditLogService.log("InventoryItem", invItem.getId(), "DEDUCT_FOR_SERVICE", actor,
                    "Xuất kho " + deductQty + " " + invItem.getUnit() + " '" + invItem.getName() +
                            "' khi ghi nhận dịch vụ '" + service.getName() + "' (Booking #" + bookingId + ")");
        }

        BookingServiceUsage usage = BookingServiceUsage.builder()
                .booking(booking)
                .extraService(service)
                .quantity(request.getQuantity())
                .unitPriceSnapshot(service.getUnitPrice()) // snapshot giá tại thời điểm ghi nhận
                .note(request.getNote())
                .isSystemMandatory(false)
                .build();
        usage = usageRepository.save(usage);
        auditLogService.log("BookingServiceUsage", usage.getId(), "ADD_SERVICE", actor,
                "Thêm dịch vụ " + service.getName() + " x" + request.getQuantity());
        
        syncPendingInvoice(bookingId);
        
        return toResponseWithItems(usage, linkedItems);
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

        if (Boolean.TRUE.equals(usage.getIsSystemMandatory())
                || (usage.getExtraService() != null && usage.getExtraService().getName().contains("ở ghép"))) {
            throw new IllegalArgumentException("Không thể xóa phụ thu người ở ghép tại đây. Phụ thu này được tự động tính theo số lượng khách ở thực tế trong tab Khách cùng phòng!");
        }
        
        String serviceName = usage.getExtraService().getName();
        
        invoiceRepository.findByBookingId(bookingId).ifPresent(invoice -> {
            if (invoice.getStatus() == InvoiceStatus.PAID) {
                throw new IllegalArgumentException("Không thể xóa dịch vụ vì hóa đơn đã được thanh toán");
            }
        });

        // Hoàn trả lại số lượng vào kho đồ dùng nếu dịch vụ có liên kết định mức kho
        if (usage.getExtraService() != null) {
            List<ExtraServiceInventoryItem> linkedItems = extraServiceInventoryItemRepository
                    .findByExtraServiceId(usage.getExtraService().getId());
            for (ExtraServiceInventoryItem link : linkedItems) {
                InventoryItem invItem = link.getInventoryItem();
                int restoreQty = link.getQuantity() * usage.getQuantity();
                invItem.setQuantityOnHand((invItem.getQuantityOnHand() != null ? invItem.getQuantityOnHand() : 0) + restoreQty);
                inventoryItemRepository.save(invItem);

                auditLogService.log("InventoryItem", invItem.getId(), "RESTORE_FOR_SERVICE", actor,
                        "Hoàn lại " + restoreQty + " " + invItem.getUnit() + " '" + invItem.getName() +
                                "' vào kho do hủy dịch vụ '" + serviceName + "' (Booking #" + bookingId + ")");
            }
        }
        
        usageRepository.delete(usage);
        auditLogService.log("BookingServiceUsage", usageId, "REMOVE_SERVICE", actor,
                "Xóa dịch vụ " + serviceName + " khỏi booking #" + bookingId);
        
        syncPendingInvoice(bookingId);
        
        return new MessageResponse("Đã xóa dịch vụ " + serviceName);
    }

    private BookingServiceUsageResponse toResponseWithItems(BookingServiceUsage u, List<ExtraServiceInventoryItem> linkedItems) {
        BigDecimal total = u.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(u.getQuantity()));

        List<ExtraServiceInventoryItemDto> itemDtos = linkedItems.stream()
                .map(item -> ExtraServiceInventoryItemDto.builder()
                        .id(item.getId())
                        .inventoryItemId(item.getInventoryItem().getId())
                        .itemName(item.getInventoryItem().getName())
                        .unit(item.getInventoryItem().getUnit())
                        .quantity(item.getQuantity() * u.getQuantity()) // Tổng số lượng đã xuất
                        .currentStock(item.getInventoryItem().getQuantityOnHand())
                        .build())
                .collect(Collectors.toList());

        return BookingServiceUsageResponse.builder()
                .id(u.getId())
                .bookingId(u.getBooking().getId())
                .extraServiceId(u.getExtraService().getId())
                .serviceName(u.getExtraService().getName())
                .quantity(u.getQuantity())
                .unitPriceSnapshot(u.getUnitPriceSnapshot())
                .total(total)
                .note(u.getNote())
                .isSystemMandatory(Boolean.TRUE.equals(u.getIsSystemMandatory()))
                .createdAt(u.getCreatedAt())
                .deductedInventoryItems(itemDtos)
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
