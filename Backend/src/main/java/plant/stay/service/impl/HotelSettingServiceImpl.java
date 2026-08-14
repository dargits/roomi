package plant.stay.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
        setting.setUpdatedBy(updatedBy);

        // Với @Transactional và Managed Entity, save() sẽ hoạt động đúng và an toàn
        HotelSetting saved = repository.save(setting);
        return mapToResponse(saved);
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
                .build();
    }
}