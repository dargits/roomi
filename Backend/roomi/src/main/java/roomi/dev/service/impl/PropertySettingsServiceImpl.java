package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.dto.request.PropertySettingsRequest;
import roomi.dev.dto.response.PropertySettingsResponse;
import roomi.dev.model.PropertySettings;
import roomi.dev.repository.PropertySettingsRepository;
import roomi.dev.service.PropertySettingsService;

import java.math.BigDecimal;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
public class PropertySettingsServiceImpl implements PropertySettingsService {

    private final PropertySettingsRepository repository;

    @Override
    @Transactional
    public PropertySettingsResponse getSettings() {
        PropertySettings settings = repository.findById(1L).orElseGet(this::createDefaultSettings);
        return toResponse(settings);
    }

    @Override
    @Transactional
    public PropertySettingsResponse updateSettings(PropertySettingsRequest request) {
        PropertySettings settings = repository.findById(1L).orElseGet(this::createDefaultSettings);

        if (request.getPropertyName() != null && !request.getPropertyName().isBlank()) {
            settings.setPropertyName(request.getPropertyName().trim());
        }
        if (request.getAddress() != null) {
            settings.setAddress(request.getAddress().trim());
        }
        if (request.getPhone() != null) {
            settings.setPhone(request.getPhone().trim());
        }
        if (request.getDefaultCheckinTime() != null) {
            settings.setDefaultCheckinTime(request.getDefaultCheckinTime());
        }
        if (request.getDefaultCheckoutTime() != null) {
            settings.setDefaultCheckoutTime(request.getDefaultCheckoutTime());
        }
        if (request.getFreeCancelHours() != null) {
            settings.setFreeCancelHours(request.getFreeCancelHours());
        }
        if (request.getCancelFeePercent() != null) {
            settings.setCancelFeePercent(request.getCancelFeePercent());
        }

        PropertySettings saved = repository.save(settings);
        return toResponse(saved);
    }

    private PropertySettings createDefaultSettings() {
        PropertySettings defaultSettings = PropertySettings.builder()
                .id(1L)
                .propertyName("Roomi Hotel & Stay")
                .address("123 Đường Hồ Chi Minh, Hà Nội")
                .phone("0901234567")
                .defaultCheckinTime(LocalTime.of(14, 0))
                .defaultCheckoutTime(LocalTime.of(12, 0))
                .freeCancelHours(24)
                .cancelFeePercent(BigDecimal.ZERO)
                .build();
        return repository.save(defaultSettings);
    }

    private PropertySettingsResponse toResponse(PropertySettings settings) {
        return PropertySettingsResponse.builder()
                .id(settings.getId())
                .propertyName(settings.getPropertyName())
                .address(settings.getAddress())
                .phone(settings.getPhone())
                .defaultCheckinTime(settings.getDefaultCheckinTime())
                .defaultCheckoutTime(settings.getDefaultCheckoutTime())
                .freeCancelHours(settings.getFreeCancelHours())
                .cancelFeePercent(settings.getCancelFeePercent())
                .build();
    }
}
