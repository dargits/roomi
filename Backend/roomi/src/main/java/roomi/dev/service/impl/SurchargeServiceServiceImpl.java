package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.dto.request.SurchargeServiceRequest;
import roomi.dev.dto.response.SurchargeServiceResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.SurchargeService;
import roomi.dev.model.User;
import roomi.dev.repository.BookingSurchargeUsageRepository;
import roomi.dev.repository.SurchargeServiceRepository;
import roomi.dev.service.SurchargeServiceService;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SurchargeServiceServiceImpl implements SurchargeServiceService {
    private final SurchargeServiceRepository surchargeServiceRepository;
    private final BookingSurchargeUsageRepository usageRepository;

    @Override
    @Transactional
    public SurchargeServiceResponse create(SurchargeServiceRequest request, User currentUser) {
        requireOwner(currentUser);
        String name = normalizeRequired(request.getName(), "name không được để trống");
        if (surchargeServiceRepository.existsByNameIgnoreCase(name)) {
            throw new BusinessException("Tên dịch vụ đã tồn tại", ErrorCode.INVALID_INPUT);
        }

        SurchargeService service = SurchargeService.builder()
                .name(name)
                .description(normalizeOptional(request.getDescription()))
                .unitPrice(request.getUnitPrice())
                .active(request.getActive() == null || request.getActive())
                .build();
        return toResponse(surchargeServiceRepository.save(service));
    }

    @Override
    @Transactional
    public SurchargeServiceResponse update(Long id, SurchargeServiceRequest request, User currentUser) {
        requireOwner(currentUser);
        SurchargeService service = findEntity(id);
        String name = normalizeRequired(request.getName(), "name không được để trống");
        surchargeServiceRepository.findByNameIgnoreCase(name)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new BusinessException("Tên dịch vụ đã tồn tại", ErrorCode.INVALID_INPUT);
                });

        service.setName(name);
        service.setDescription(normalizeOptional(request.getDescription()));
        service.setUnitPrice(request.getUnitPrice());
        if (request.getActive() != null) {
            service.setActive(request.getActive());
        }
        service.setUpdatedAt(LocalDateTime.now());
        return toResponse(surchargeServiceRepository.save(service));
    }

    @Override
    @Transactional
    public SurchargeServiceResponse deactivate(Long id, User currentUser) {
        requireOwner(currentUser);
        SurchargeService service = findEntity(id);
        service.setActive(false);
        service.setUpdatedAt(LocalDateTime.now());
        return toResponse(surchargeServiceRepository.save(service));
    }

    @Override
    @Transactional
    public SurchargeServiceResponse reactivate(Long id, User currentUser) {
        requireOwner(currentUser);
        SurchargeService service = findEntity(id);
        service.setActive(true);
        service.setUpdatedAt(LocalDateTime.now());
        return toResponse(surchargeServiceRepository.save(service));
    }

    @Override
    @Transactional
    public void delete(Long id, User currentUser) {
        requireOwner(currentUser);
        SurchargeService service = findEntity(id);
        if (usageRepository.existsBySurchargeServiceId(id)) {
            throw new BusinessException(
                    "Dịch vụ đã có phát sinh, chỉ có thể ngừng hoạt động",
                    ErrorCode.SURCHARGE_SERVICE_IN_USE);
        }
        surchargeServiceRepository.delete(service);
    }

    @Override
    public SurchargeServiceResponse getById(Long id) {
        return toResponse(findEntity(id));
    }

    @Override
    public List<SurchargeServiceResponse> getAll(boolean activeOnly) {
        List<SurchargeService> services = activeOnly
                ? surchargeServiceRepository.findByActiveTrueOrderByNameAsc()
                : surchargeServiceRepository.findAllByOrderByNameAsc();
        return services.stream().map(this::toResponse).toList();
    }

    private SurchargeService findEntity(Long id) {
        return surchargeServiceRepository.findById(id)
                .orElseThrow(() -> new BusinessException(
                        "Không tìm thấy dịch vụ phụ thu", ErrorCode.SURCHARGE_SERVICE_NOT_FOUND));
    }

    private void requireOwner(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getActive()) || user.getRole() != User.Role.OWNER) {
            throw new BusinessException("Bạn không có quyền quản lý dịch vụ phụ thu", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new BusinessException(message, ErrorCode.MISSING_REQUIRED_FIELD);
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private SurchargeServiceResponse toResponse(SurchargeService service) {
        return SurchargeServiceResponse.builder()
                .id(service.getId())
                .name(service.getName())
                .description(service.getDescription())
                .unitPrice(service.getUnitPrice())
                .active(service.getActive())
                .createdAt(service.getCreatedAt())
                .updatedAt(service.getUpdatedAt())
                .build();
    }
}
