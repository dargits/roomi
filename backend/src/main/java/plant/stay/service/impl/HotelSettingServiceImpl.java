package plant.stay.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.GoogleApiKeysRequest;
import plant.stay.dto.request.HotelSettingRequest;
import plant.stay.dto.response.HotelSettingResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.HotelSetting;
import plant.stay.model.User;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.service.HotelSettingService;

@Service
public class HotelSettingServiceImpl implements HotelSettingService {

    @Autowired
    private HotelSettingRepository repository;

    @Override
    @Transactional(readOnly = true)
    public HotelSettingResponse getSetting() {
        HotelSetting setting = repository.findById(1L)
                .orElseThrow(() -> new ResourceNotFoundException("Cấu hình cơ sở không tồn tại."));
        return mapToResponse(setting);
    }

    @Override
    @Transactional // <--- RẤT QUAN TRỌNG: Giữ Persistence Context trong suốt quá trình update
    public HotelSettingResponse updateSetting(HotelSettingRequest request, User updatedBy) {
        // Validation checkout time
        if (!request.getDefaultCheckoutTime().isAfter(request.getDefaultCheckinTime())) {
            throw new IllegalArgumentException("Giờ trả phòng phải sau giờ nhận phòng.");
        }

        // Lấy entity Managed từ DB.
        // Nếu chưa có, tạo đối tượng mới hoàn toàn (không set ID trước, để DB tự sinh)
        HotelSetting setting = repository.findById(1L)
                .orElseGet(HotelSetting::new);

        setting.setPropertyName(request.getPropertyName());
        setting.setAddress(request.getAddress());
        setting.setPhone(request.getPhone());
        setting.setEmail(request.getEmail());
        setting.setDefaultCheckinTime(request.getDefaultCheckinTime());
        setting.setDefaultCheckoutTime(request.getDefaultCheckoutTime());
        setting.setHomeImage(request.getHomeImage());
        if (request.getReminderEmailEnabled() != null) {
            setting.setReminderEmailEnabled(request.getReminderEmailEnabled());
        }
        if (request.getReminderMorningTime() != null) {
            setting.setReminderMorningTime(request.getReminderMorningTime());
        }
        if (request.getLostItemRetentionDays() != null) {
            setting.setLostItemRetentionDays(request.getLostItemRetentionDays());
        }
        if (request.getPeriodicCleaningEnabled() != null) {
            setting.setPeriodicCleaningEnabled(request.getPeriodicCleaningEnabled());
        }
        if (request.getPeriodicCleaningDays() != null) {
            setting.setPeriodicCleaningDays(request.getPeriodicCleaningDays());
        }
        if (request.getSessionTimeoutMinutes() != null) {
            setting.setSessionTimeoutMinutes(request.getSessionTimeoutMinutes());
        }
        if (request.getMaxConcurrentSessions() != null) {
            setting.setMaxConcurrentSessions(request.getMaxConcurrentSessions());
        }
        if (request.getMaxSessionLifetimeHours() != null) {
            setting.setMaxSessionLifetimeHours(request.getMaxSessionLifetimeHours());
        }
        if (request.getPublicInvoiceLookupEnabled() != null) {
            setting.setPublicInvoiceLookupEnabled(request.getPublicInvoiceLookupEnabled());
        }
        if (request.getPriceSuggestionHighThreshold() != null) {
            setting.setPriceSuggestionHighThreshold(request.getPriceSuggestionHighThreshold());
        }
        if (request.getPriceSuggestionLowThreshold() != null) {
            setting.setPriceSuggestionLowThreshold(request.getPriceSuggestionLowThreshold());
        }
        if (request.getPriceSuggestionImminentDays() != null) {
            setting.setPriceSuggestionImminentDays(request.getPriceSuggestionImminentDays());
        }
        if (request.getPriceSuggestionConfigured() != null) {
            setting.setPriceSuggestionConfigured(request.getPriceSuggestionConfigured());
        }
        setting.setUpdatedBy(updatedBy);

        // Với @Transactional và Managed Entity, save() sẽ hoạt động đúng và an toàn
        HotelSetting saved = repository.save(setting);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public String getGoogleApiKeys() {
        HotelSetting setting = repository.findById(1L)
                .orElseThrow(() -> new ResourceNotFoundException("Cấu hình cơ sở không tồn tại."));
        return setting.getGoogleApiKeys() != null ? setting.getGoogleApiKeys() : "";
    }

    @Override
    @Transactional
    public void updateGoogleApiKeys(GoogleApiKeysRequest request) {
        HotelSetting setting = repository.findById(1L)
                .orElseThrow(() -> new ResourceNotFoundException("Cấu hình cơ sở không tồn tại."));
        // Loại bỏ các dòng trắng và khoảng trắng thừa, giữ đúng 1 key mỗi dòng
        String cleaned = null;
        if (request.getGoogleApiKeys() != null) {
            cleaned = request.getGoogleApiKeys().lines()
                    .map(String::trim)
                    .filter(line -> !line.isEmpty())
                    .reduce("", (a, b) -> a.isEmpty() ? b : a + "\n" + b);
            if (cleaned.isEmpty()) cleaned = null;
        }
        setting.setGoogleApiKeys(cleaned);
        repository.save(setting);
    }

    private HotelSettingResponse mapToResponse(HotelSetting setting) {
        return HotelSettingResponse.builder()
                .id(setting.getId())
                .propertyName(setting.getPropertyName())
                .address(setting.getAddress())
                .phone(setting.getPhone())
                .email(setting.getEmail())
                .defaultCheckinTime(setting.getDefaultCheckinTime())
                .defaultCheckoutTime(setting.getDefaultCheckoutTime())
                .homeImage(setting.getHomeImage())
                .reminderEmailEnabled(
                        setting.getReminderEmailEnabled() != null ? setting.getReminderEmailEnabled() : true)
                .reminderMorningTime(setting.getReminderMorningTime() != null ? setting.getReminderMorningTime()
                        : java.time.LocalTime.of(10, 30))
                .lostItemRetentionDays(setting.getLostItemRetentionDays() != null ? setting.getLostItemRetentionDays() : 30)
                .periodicCleaningEnabled(setting.getPeriodicCleaningEnabled() != null ? setting.getPeriodicCleaningEnabled() : true)
                .periodicCleaningDays(setting.getPeriodicCleaningDays() != null ? setting.getPeriodicCleaningDays() : 5)
                .sessionTimeoutMinutes(setting.getSessionTimeoutMinutes() != null ? setting.getSessionTimeoutMinutes() : 120)
                .maxConcurrentSessions(setting.getMaxConcurrentSessions() != null ? setting.getMaxConcurrentSessions() : 0)
                .maxSessionLifetimeHours(setting.getMaxSessionLifetimeHours() != null ? setting.getMaxSessionLifetimeHours() : 24)
                .publicInvoiceLookupEnabled(setting.getPublicInvoiceLookupEnabled() != null ? setting.getPublicInvoiceLookupEnabled() : true)
                .priceSuggestionHighThreshold(setting.getPriceSuggestionHighThreshold() != null ? setting.getPriceSuggestionHighThreshold() : 80.0)
                .priceSuggestionLowThreshold(setting.getPriceSuggestionLowThreshold() != null ? setting.getPriceSuggestionLowThreshold() : 30.0)
                .priceSuggestionImminentDays(setting.getPriceSuggestionImminentDays() != null ? setting.getPriceSuggestionImminentDays() : 7)
                .priceSuggestionConfigured(setting.getPriceSuggestionConfigured() != null ? setting.getPriceSuggestionConfigured() : true)
                .googleApiKeys(setting.getGoogleApiKeys())
                .build();
    }
}