package plant.stay.service;

import plant.stay.dto.request.RoomRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.RoomResponse;
import plant.stay.model.RoomStatus;
import plant.stay.model.User;

import java.util.List;

public interface RoomService {
    List<RoomResponse> getAll();
    List<RoomResponse> getByStatus(RoomStatus status);
    RoomResponse getById(Long id);
    RoomResponse create(RoomRequest request, User actor);
    RoomResponse update(Long id, RoomRequest request, User actor);
    MessageResponse delete(Long id);
    RoomResponse markClean(Long id, User actor);
    RoomResponse setMaintenance(Long id, User actor);
}
