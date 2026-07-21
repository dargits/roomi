package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import roomi.dev.model.Room;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {

    boolean existsByRoomNumber(String roomNumber);

    /** Lấy tất cả phòng thuộc một loại phòng */
    List<Room> findByRoomTypeId(Long roomTypeId);

    /** Lấy tất cả phòng còn AVAILABLE thuộc một loại phòng */
    List<Room> findByRoomTypeIdAndStatus(Long roomTypeId, Room.Status status);
}
 