package roomi.dev.service;

import roomi.dev.dto.request.PropertySettingsRequest;
import roomi.dev.dto.response.PropertySettingsResponse;

public interface PropertySettingsService {
    PropertySettingsResponse getSettings();
    PropertySettingsResponse updateSettings(PropertySettingsRequest request);
}
