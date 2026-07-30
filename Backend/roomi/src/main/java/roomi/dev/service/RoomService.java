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

    /**
     * Cập nhật trạng thái buồng phòng (dành cho HOUSEKEEPER — NCL-06, §2.5).
     * Dùng để chuyển phòng NEEDS_CLEANING → AVAILABLE sau khi dọn xong.
     *
     * @param id     ID phòng cần cập nhật
     * @param status Trạng thái mới: AVAILABLE, NEEDS_CLEANING, MAINTENANCE, OCCUPIED
     * @return       Phòng sau khi cập nhật
     */
    Room updateRoomStatus(Long id, String status);

    /**
     * Đồng bộ trạng thái phòng theo booking CHECKED_IN đang hoạt động hôm nay.
     * - Phòng có CHECKED_IN booking → OCCUPIED
     * - Phòng đang OCCUPIED nhưng không có CHECKED_IN booking → AVAILABLE
     * - Phòng MAINTENANCE / NEEDS_CLEANING → giữ nguyên
     * Trả về số phòng đã được cập nhật.
     */
    int syncRoomStatuses();
}
