package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.ChannelRoomMapping;

import java.util.List;

public interface ChannelRoomMappingRepository extends JpaRepository<ChannelRoomMapping, Long> {

    List<ChannelRoomMapping> findByChannelId(Long channelId);

    List<ChannelRoomMapping> findByRoomTypeId(Long roomTypeId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ChannelRoomMapping m WHERE m.channel.id = :channelId")
    void deleteByChannelId(@Param("channelId") Long channelId);

    @Query("SELECT COALESCE(SUM(m.allocatedRooms), 0) FROM ChannelRoomMapping m " +
           "WHERE m.roomType.id = :roomTypeId AND m.channel.isActive = true AND (:excludeChannelId IS NULL OR m.channel.id <> :excludeChannelId)")
    int sumAllocatedByRoomTypeAcrossOtherActiveChannels(
            @Param("roomTypeId") Long roomTypeId,
            @Param("excludeChannelId") Long excludeChannelId);
}
