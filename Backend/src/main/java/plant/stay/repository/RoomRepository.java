package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.Room;
import plant.stay.model.RoomStatus;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByRoomNumber(String roomNumber);
    List<Room> findByStatus(RoomStatus status);
    List<Room> findByRoomTypeId(Long roomTypeId);
    boolean existsByRoomNumber(String roomNumber);

    @Query("SELECT r FROM Room r WHERE r.roomType.id = :roomTypeId AND r.status = :status")
    List<Room> findByRoomTypeIdAndStatus(@Param("roomTypeId") Long roomTypeId, @Param("status") RoomStatus status);
}
