package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.dto.request.RoomRequest;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Room;
import roomi.dev.model.RoomType;
import roomi.dev.repository.RoomRepository;
import roomi.dev.repository.RoomTypeRepository;
import roomi.dev.service.RoomService;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;

    @Override
    public Room createRoom(RoomRequest request) {
        if (roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new BusinessException("Phòng này đã tồn tại", ErrorCode.INVALID_INPUT);
        }

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new BusinessException("Loại phòng không tồn tại", ErrorCode.INVALID_INPUT));

        Room room = Room.builder()
                .roomType(roomType)
                .roomNumber(request.getRoomNumber())
                .floor(request.getFloor())
                .note(request.getNote())
                .build();

        if (request.getStatus() != null) {
            room.setStatus(Room.Status.valueOf(request.getStatus().toUpperCase()));
        }

        return roomRepository.save(room);
    }

    @Override
    public Room updateRoom(Long id, RoomRequest request) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phòng", ErrorCode.INVALID_INPUT));

        if (!room.getRoomNumber().equals(request.getRoomNumber()) && roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new BusinessException("Phòng này đã tồn tại", ErrorCode.INVALID_INPUT);
        }

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new BusinessException("Loại phòng không tồn tại", ErrorCode.INVALID_INPUT));

        room.setRoomType(roomType);
        room.setRoomNumber(request.getRoomNumber());
        room.setFloor(request.getFloor());
        room.setNote(request.getNote());
        if (request.getStatus() != null) {
            room.setStatus(Room.Status.valueOf(request.getStatus().toUpperCase()));
        }

        return roomRepository.save(room);
    }

    @Override
    public void deleteRoom(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phòng", ErrorCode.INVALID_INPUT));
        roomRepository.delete(room);
    }

    @Override
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    @Override
    public Room getRoomById(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phòng", ErrorCode.INVALID_INPUT));
    }
}
