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
    long countByStatus(RoomStatus status);
    long countByRoomTypeId(Long roomTypeId);

    @Query(value = "SELECT * FROM rooms WHERE room_type_id = :roomTypeId FOR UPDATE", nativeQuery = true)
    List<Room> findByRoomTypeIdForUpdate(@Param("roomTypeId") Long roomTypeId);

    @Query(value = "SELECT * FROM rooms WHERE id IN (:roomIds) ORDER BY id FOR UPDATE", nativeQuery = true)
    List<Room> findByIdsForUpdate(@Param("roomIds") List<Long> roomIds);

    @Query("SELECT r FROM Room r WHERE r.roomType.id = :roomTypeId AND r.status = :status")
    List<Room> findByRoomTypeIdAndStatus(@Param("roomTypeId") Long roomTypeId, @Param("status") RoomStatus status);

    @Query("SELECT r FROM Room r WHERE r.roomType.id = :roomTypeId AND r.status = :status " +
           "AND NOT EXISTS (SELECT b FROM Booking b WHERE b.room = r " +
           "AND b.status IN ('CONFIRMED', 'CHECKED_IN') " +
           "AND b.checkInDate < :checkOut AND b.checkOutDate > :checkIn) ORDER BY r.roomNumber")
    List<Room> findAvailableWithoutConflicts(@Param("roomTypeId") Long roomTypeId,
                                             @Param("status") RoomStatus status,
                                             @Param("checkIn") java.time.LocalDate checkIn,
                                             @Param("checkOut") java.time.LocalDate checkOut);
}
