package roomi.dev.service;

import roomi.dev.dto.request.RoomTypeRequest;
import roomi.dev.model.RoomType;

import java.util.List;

public interface RoomTypeService {
    RoomType createRoomType(RoomTypeRequest request);
    RoomType updateRoomType(Long id, RoomTypeRequest request);
    List<RoomType> getAllRoomTypes();
    RoomType getRoomTypeById(Long id);
    void deleteRoomType(Long id);
}
