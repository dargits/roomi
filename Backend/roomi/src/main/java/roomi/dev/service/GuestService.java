package roomi.dev.service;

import roomi.dev.dto.request.GuestRequest;
import roomi.dev.dto.response.GuestResponse;
import roomi.dev.model.Guest;

import java.util.List;

public interface GuestService {
    Guest findById1(Long id);
    Guest findByIdNumber(String idNumber);

    /**
     * Tìm khách theo CCCD, nếu chưa có thì tạo mới.
     * Dùng khi tạo booking để tự động tạo khách mới nếu chưa tồn tại.
     */
    Guest findOrCreateGuest(String idNumber, String fullName, String phone, String email, String note);

    GuestResponse createGuest(GuestRequest request);

    GuestResponse updateGuest(Long id, GuestRequest request);

    void deleteGuest(Long id);

    GuestResponse getGuestById(Long id);

    List<GuestResponse> getAllGuests();

    List<GuestResponse> searchByName(String name);

    /** Tìm khách theo SĐT — dùng khi lễ tân check nhanh khi walk-in */
    GuestResponse getGuestByPhone(String phone);

    Guest findById(Long id);
}
