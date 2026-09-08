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
    RoomResponse markDirty(Long id, User actor);
    RoomResponse setMaintenance(Long id, User actor);
    List<RoomResponse> getAvailableWithoutConflicts(Long roomTypeId, java.time.LocalDate checkInDate, java.time.LocalDate checkOutDate);
    // NCL-06-CN-NEW: Housekeeping 2 bước
    RoomResponse submitForInspection(Long id, User actor);   // DIRTY → INSPECTING
    RoomResponse approveClean(Long id, User actor);          // INSPECTING → AVAILABLE
    // NCL-06-CN-NEW: Phân công nhân viên dọn phòng
    RoomResponse assignCleaner(Long id, Long housekeeperId, User actor);
    RoomResponse unassignCleaner(Long id, User actor);
}
