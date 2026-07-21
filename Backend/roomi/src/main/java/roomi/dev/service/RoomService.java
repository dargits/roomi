package roomi.dev.service;

import roomi.dev.dto.request.RoomRequest;
import roomi.dev.model.Room;

import java.util.List;

public interface RoomService {
    Room createRoom(RoomRequest request);
    Room updateRoom(Long id, RoomRequest request);
    void deleteRoom(Long id);
    List<Room> getAllRooms();
    Room getRoomById(Long id);
}
