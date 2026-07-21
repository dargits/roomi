package roomi.dev.service;

import roomi.dev.dto.request.GuestRequest;
import roomi.dev.dto.response.GuestResponse;

import java.util.List;

public interface GuestService {

    GuestResponse createGuest(GuestRequest request);

    GuestResponse updateGuest(Long id, GuestRequest request);

    void deleteGuest(Long id);

    GuestResponse getGuestById(Long id);

    List<GuestResponse> getAllGuests();

    List<GuestResponse> searchByName(String name);

    /** Tìm khách theo SĐT — dùng khi lễ tân check nhanh khi walk-in */
    GuestResponse getGuestByPhone(String phone);
}
