package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.ExtraServiceInventoryItemDto;
import plant.stay.dto.request.ExtraServiceRequest;
import plant.stay.dto.response.ExtraServiceResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.ExtraService;
import plant.stay.model.ExtraServiceInventoryItem;
import plant.stay.model.InventoryItem;
import plant.stay.repository.BookingServiceUsageRepository;
import plant.stay.repository.ExtraServiceInventoryItemRepository;
import plant.stay.repository.ExtraServiceRepository;
import plant.stay.repository.InventoryItemRepository;
import plant.stay.service.ExtraServiceService;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExtraServiceImpl implements ExtraServiceService {

    private final ExtraServiceRepository repository;
    private final ExtraServiceInventoryItemRepository extraServiceInventoryItemRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final BookingServiceUsageRepository bookingServiceUsageRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ExtraServiceResponse> getAllPublic() {
        List<ExtraService> services = repository.findAllByActiveTrue();
        return mapToResponsesWithItems(services);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExtraServiceResponse> getAllAdmin() {
        List<ExtraService> services = repository.findAll();
        return mapToResponsesWithItems(services);
    }

    @Override
    @Transactional(readOnly = true)
    public ExtraServiceResponse getById(Long id) {
        ExtraService service = getServiceById(id);
        List<ExtraServiceInventoryItem> items = extraServiceInventoryItemRepository.findByExtraServiceId(id);
        long usageCount = bookingServiceUsageRepository.countByExtraServiceId(id);
        return mapToResponse(service, items, usageCount);
    }

    @Override
    @Transactional
    public ExtraServiceResponse create(ExtraServiceRequest request) {
        ExtraService service = ExtraService.builder()
                .name(request.getName())
                .description(request.getDescription())
                .unitPrice(request.getUnitPrice())
                .unit(request.getUnit())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();
        service = repository.save(service);

        List<ExtraServiceInventoryItem> savedItems = new ArrayList<>();
        if (request.getInventoryItems() != null && !request.getInventoryItems().isEmpty()) {
            savedItems = saveLinkedInventoryItems(service, request.getInventoryItems());
        }

        return mapToResponse(service, savedItems, 0L);
    }

    @Override
    @Transactional
    public ExtraServiceResponse update(Long id, ExtraServiceRequest request) {
        ExtraService service = getServiceById(id);
        service.setName(request.getName());
        service.setDescription(request.getDescription());
        service.setUnitPrice(request.getUnitPrice());
        service.setUnit(request.getUnit());
        if (request.getActive() != null) {
            service.setActive(request.getActive());
        }
        service = repository.save(service);

        List<ExtraServiceInventoryItem> currentItems;
        if (request.getInventoryItems() != null) {
            extraServiceInventoryItemRepository.deleteByExtraServiceId(id);
            currentItems = saveLinkedInventoryItems(service, request.getInventoryItems());
        } else {
            currentItems = extraServiceInventoryItemRepository.findByExtraServiceId(id);
        }

        long usageCount = bookingServiceUsageRepository.countByExtraServiceId(id);
        return mapToResponse(service, currentItems, usageCount);
    }

    @Override
    @Transactional
    public MessageResponse delete(Long id) {
        ExtraService service = getServiceById(id);
        long usageCount = bookingServiceUsageRepository.countByExtraServiceId(id);

        if (usageCount > 0) {
            // Dịch vụ đã phát sinh giao dịch trong đặt phòng của khách: Không thể xóa cứng
            if (service.isActive()) {
                service.setActive(false);
                repository.save(service);
                return new MessageResponse(String.format(
                        "Dịch vụ \"%s\" đã phát sinh giao dịch trong %d đặt phòng. Hệ thống đã tự động chuyển sang trạng thái \"Ngừng hoạt động\" để bảo toàn dữ liệu lịch sử hóa đơn.",
                        service.getName(), usageCount));
            } else {
                throw new BusinessException(String.format(
                        "Dịch vụ \"%s\" đã có lịch sử giao dịch trong %d đặt phòng của khách nên không thể xóa hoàn toàn khỏi cơ sở dữ liệu. Dịch vụ hiện đã ở trạng thái Ngừng hoạt động.",
                        service.getName(), usageCount), HttpStatus.BAD_REQUEST);
            }
        }

        // Chưa từng phát sinh trong bất kỳ đặt phòng nào -> Cho phép xóa vĩnh viễn
        extraServiceInventoryItemRepository.deleteByExtraServiceId(id);
        repository.delete(service);
        return new MessageResponse(String.format("Đã xóa vĩnh viễn dịch vụ \"%s\" khỏi hệ thống.", service.getName()));
    }

    private ExtraService getServiceById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ phụ thu"));
    }

    private List<ExtraServiceInventoryItem> saveLinkedInventoryItems(
            ExtraService service, List<ExtraServiceInventoryItemDto> dtos) {
        List<ExtraServiceInventoryItem> entities = new ArrayList<>();
        Set<Long> processedItemIds = new HashSet<>();

        for (ExtraServiceInventoryItemDto dto : dtos) {
            if (dto.getInventoryItemId() == null || processedItemIds.contains(dto.getInventoryItemId())) {
                continue;
            }
            processedItemIds.add(dto.getInventoryItemId());

            InventoryItem invItem = inventoryItemRepository.findById(dto.getInventoryItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mặt hàng trong kho (ID: " + dto.getInventoryItemId() + ")"));

            int qty = (dto.getQuantity() != null && dto.getQuantity() > 0) ? dto.getQuantity() : 1;

            ExtraServiceInventoryItem itemEntity = ExtraServiceInventoryItem.builder()
                    .extraService(service)
                    .inventoryItem(invItem)
                    .quantity(qty)
                    .build();
            entities.add(extraServiceInventoryItemRepository.save(itemEntity));
        }
        return entities;
    }

    private List<ExtraServiceResponse> mapToResponsesWithItems(List<ExtraService> services) {
        if (services.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> serviceIds = services.stream().map(ExtraService::getId).collect(Collectors.toList());
        List<ExtraServiceInventoryItem> allLinkedItems = extraServiceInventoryItemRepository.findByExtraServiceIdIn(serviceIds);

        Map<Long, List<ExtraServiceInventoryItem>> groupedItems = allLinkedItems.stream()
                .collect(Collectors.groupingBy(item -> item.getExtraService().getId()));

        List<Object[]> usageResults = bookingServiceUsageRepository.countUsagesByServiceIds(serviceIds);
        Map<Long, Long> usageMap = usageResults.stream()
                .collect(Collectors.toMap(r -> (Long) r[0], r -> (Long) r[1]));

        return services.stream()
                .map(s -> mapToResponse(
                        s,
                        groupedItems.getOrDefault(s.getId(), Collections.emptyList()),
                        usageMap.getOrDefault(s.getId(), 0L)))
                .collect(Collectors.toList());
    }

    private ExtraServiceResponse mapToResponse(ExtraService service, List<ExtraServiceInventoryItem> linkedItems, long usageCount) {
        List<ExtraServiceInventoryItemDto> itemDtos = linkedItems.stream()
                .map(item -> ExtraServiceInventoryItemDto.builder()
                        .id(item.getId())
                        .inventoryItemId(item.getInventoryItem().getId())
                        .itemName(item.getInventoryItem().getName())
                        .unit(item.getInventoryItem().getUnit())
                        .quantity(item.getQuantity())
                        .currentStock(item.getInventoryItem().getQuantityOnHand())
                        .build())
                .collect(Collectors.toList());

        return ExtraServiceResponse.builder()
                .id(service.getId())
                .name(service.getName())
                .description(service.getDescription())
                .unitPrice(service.getUnitPrice())
                .unit(service.getUnit())
                .active(service.isActive())
                .createdAt(service.getCreatedAt())
                .updatedAt(service.getUpdatedAt())
                .inventoryItems(itemDtos)
                .usageCount(usageCount)
                .hasBookings(usageCount > 0)
                .build();
    }
}
