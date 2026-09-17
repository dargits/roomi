package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import plant.stay.model.ChannelRoomBlock;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChannelRoomBlockRepository extends JpaRepository<ChannelRoomBlock, Long> {

    List<ChannelRoomBlock> findByChannelId(Long channelId);

    List<ChannelRoomBlock> findByChannelIdAndStatus(Long channelId, String status);

    Optional<ChannelRoomBlock> findByChannelIdAndExternalUid(Long channelId, String externalUid);

    long countByChannelIdAndStatus(Long channelId, String status);

    void deleteByChannelId(Long channelId);

    // Lấy các lượt chặn phòng đang hoạt động (BLOCKED) nằm trong khoảng thời gian xem lịch
    @Query("SELECT b FROM ChannelRoomBlock b " +
           "LEFT JOIN FETCH b.channel " +
           "LEFT JOIN FETCH b.roomType " +
           "LEFT JOIN FETCH b.room " +
           "WHERE b.status = 'BLOCKED' " +
           "AND b.startDate <= :to AND b.endDate >= :from")
    List<ChannelRoomBlock> findActiveBlocksBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    // Kiểm tra xung đột phòng: phòng đã bị chặn bởi kênh trong khoảng thời gian [checkIn, checkOut)
    @Query("SELECT b FROM ChannelRoomBlock b WHERE b.room.id = :roomId " +
           "AND b.status = 'BLOCKED' " +
           "AND b.startDate < :checkOut AND b.endDate > :checkIn")
    List<ChannelRoomBlock> findConflictingBlocks(@Param("roomId") Long roomId,
                                                @Param("checkIn") LocalDate checkIn,
                                                @Param("checkOut") LocalDate checkOut);

    // Lấy các lượt chặn của một loại phòng trong khoảng ngày
    @Query("SELECT b FROM ChannelRoomBlock b WHERE b.roomType.id = :roomTypeId " +
           "AND b.status = 'BLOCKED' " +
           "AND b.startDate < :checkOut AND b.endDate > :checkIn")
    List<ChannelRoomBlock> findActiveBlocksByRoomTypeAndDates(@Param("roomTypeId") Long roomTypeId,
                                                             @Param("checkIn") LocalDate checkIn,
                                                             @Param("checkOut") LocalDate checkOut);

    // Lấy các lượt chặn BLOCKED của một kênh có ngày kết thúc >= ngày chỉ định (dùng để gỡ các lượt chặn đã mất khỏi file iCal)
    @Query("SELECT b FROM ChannelRoomBlock b WHERE b.channel.id = :channelId " +
           "AND b.status = 'BLOCKED' " +
           "AND b.endDate >= :sinceDate")
    List<ChannelRoomBlock> findActiveBlocksForChannelSince(@Param("channelId") Long channelId,
                                                          @Param("sinceDate") LocalDate sinceDate);
}
