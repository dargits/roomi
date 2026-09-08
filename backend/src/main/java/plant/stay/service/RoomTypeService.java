package plant.stay.service;

import plant.stay.dto.request.RoomTypeRequest;
import plant.stay.dto.response.RoomTypeResponse;

import java.util.List;

public interface RoomTypeService {
    List<RoomTypeResponse> getAllRoomTypes();
    List<RoomTypeResponse> getActiveRoomTypes();
    RoomTypeResponse getRoomTypeById(Long id);
    RoomTypeResponse createRoomType(RoomTypeRequest request);
    RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request);
    void deleteRoomType(Long id);
}
