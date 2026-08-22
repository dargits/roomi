package plant.stay.service;

import plant.stay.dto.request.GuestRequest;
import plant.stay.dto.response.GuestResponse;
import plant.stay.model.User;

import java.util.List;

public interface GuestService {
    List<GuestResponse> getAll(String search);
    GuestResponse getById(Long id);
    GuestResponse create(GuestRequest request);
    GuestResponse update(Long id, GuestRequest request);
    List<?> getHistory(Long guestId);

    void delete(Long id);

    /**
     * NCL-12-CN-005: Xóa (ẩn danh hóa) dữ liệu cá nhân của khách theo yêu cầu.
     * Kiểm tra không có hóa đơn PENDING trước khi xóa (QTN-24).
     * Anonymize in-place: giữ FK, thay thế bằng "[Đã xóa]".
     */
    void deletePersonalData(Long guestId, User actor);
}

