package plant.stay.service;

import plant.stay.dto.request.GuestRequest;
import plant.stay.dto.response.GuestResponse;

import java.util.List;

public interface GuestService {
    List<GuestResponse> getAll(String search);
    GuestResponse getById(Long id);
    GuestResponse create(GuestRequest request);
    GuestResponse update(Long id, GuestRequest request);
    List<?> getHistory(Long guestId);
}
