package plant.stay.service;

import plant.stay.dto.request.HotelSettingRequest;
import plant.stay.dto.response.HotelSettingResponse;
import plant.stay.model.User;

public interface HotelSettingService {
    HotelSettingResponse getSetting();
    HotelSettingResponse updateSetting(HotelSettingRequest request, User updatedBy);
}
