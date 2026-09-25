package plant.stay.service;

import plant.stay.dto.request.GoogleApiKeysRequest;
import plant.stay.dto.request.HotelSettingRequest;
import plant.stay.dto.response.HotelSettingResponse;
import plant.stay.model.User;

public interface HotelSettingService {
    HotelSettingResponse getSetting();
    HotelSettingResponse updateSetting(HotelSettingRequest request, User updatedBy);

    /** Lấy danh sách Google API Key (chuỗi, mỗi key 1 dòng). */
    String getGoogleApiKeys();

    /** Lưu/cập nhật danh sách Google API Key. */
    void updateGoogleApiKeys(GoogleApiKeysRequest request);
}
