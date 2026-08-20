package plant.stay.service;

import plant.stay.dto.request.GroupBookingRequest;
import plant.stay.dto.response.GroupBookingResponse;
import plant.stay.model.User;

import java.util.List;

public interface GroupBookingService {
    GroupBookingResponse create(GroupBookingRequest request, User actor);
    List<GroupBookingResponse> getAll();
    GroupBookingResponse getById(Long id);
}