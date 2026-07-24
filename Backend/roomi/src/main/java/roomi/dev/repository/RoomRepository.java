package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import roomi.dev.model.Room;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {

    boolean existsByRoomNumber(String roomNumber);

    /** Lấy tất cả phòng và sắp xếp theo tầng và số phòng */
    List<Room> findAllByOrderByFloorAscRoomNumberAsc();

    /** Lấy tất cả phòng thuộc một loại phòng và sắp xếp theo tầng và số phòng */
    List<Room> findByRoomTypeIdOrderByFloorAscRoomNumberAsc(Long roomTypeId);

    /** Lấy tất cả phòng thuộc một loại phòng */
    List<Room> findByRoomTypeId(Long roomTypeId);

    /** Lấy tất cả phòng còn AVAILABLE thuộc một loại phòng */
    List<Room> findByRoomTypeIdAndStatus(Long roomTypeId, Room.Status status);
}
 