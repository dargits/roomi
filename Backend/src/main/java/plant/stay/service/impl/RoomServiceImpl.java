package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.RoomRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.RoomResponse;
import plant.stay.exception.DuplicateResourceException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.RoomService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final AuditLogService auditLogService;

    @Override
    public List<RoomResponse> getAll() {
        return roomRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<RoomResponse> getByStatus(RoomStatus status) {
        return roomRepository.findByStatus(status).stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public RoomResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Override
    @Transactional
    public RoomResponse create(RoomRequest request, User actor) {
        if (roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new DuplicateResourceException("Số phòng '" + request.getRoomNumber() + "' đã tồn tại");
        }
        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));

        Room room = Room.builder()
                .roomNumber(request.getRoomNumber())
                .roomType(roomType)
                .floor(request.getFloor())
                .status(request.getStatus() != null ? request.getStatus() : RoomStatus.AVAILABLE)
                .notes(request.getNotes())
                .build();
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "CREATE", actor, "Tạo phòng " + room.getRoomNumber());
        return toResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse update(Long id, RoomRequest request, User actor) {
        Room room = findById(id);
        if (!room.getRoomNumber().equals(request.getRoomNumber()) &&
            roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new DuplicateResourceException("Số phòng '" + request.getRoomNumber() + "' đã tồn tại");
        }
        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));

        room.setRoomNumber(request.getRoomNumber());
        room.setRoomType(roomType);
        room.setFloor(request.getFloor());
        if (request.getStatus() != null) room.setStatus(request.getStatus());
        room.setNotes(request.getNotes());
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "UPDATE", actor, "Cập nhật phòng " + room.getRoomNumber());
        return toResponse(room);
    }

    @Override
    @Transactional
    public MessageResponse delete(Long id) {
        Room room = findById(id);
        roomRepository.delete(room);
        return new MessageResponse("Đã xóa phòng " + room.getRoomNumber());
    }

    @Override
    @Transactional
    public RoomResponse markClean(Long id, User actor) {
        Room room = findById(id);
        if (room.getStatus() != RoomStatus.DIRTY) {
            throw new IllegalArgumentException("Chỉ có thể đánh dấu sạch khi phòng đang ở trạng thái DIRTY");
        }
        room.setStatus(RoomStatus.AVAILABLE);
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "MARK_CLEAN", actor, "Phòng " + room.getRoomNumber() + " đã dọn xong");
        return toResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse setMaintenance(Long id, User actor) {
        Room room = findById(id);
        room.setStatus(RoomStatus.MAINTENANCE);
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "MAINTENANCE", actor, "Khóa phòng " + room.getRoomNumber() + " để bảo trì");
        return toResponse(room);
    }

    private Room findById(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + id));
    }

    private RoomResponse toResponse(Room room) {
        return RoomResponse.builder()
                .id(room.getId())
                .roomNumber(room.getRoomNumber())
                .roomTypeId(room.getRoomType().getId())
                .roomTypeName(room.getRoomType().getName())
                .floor(room.getFloor())
                .status(room.getStatus())
                .notes(room.getNotes())
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .build();
    }
}
