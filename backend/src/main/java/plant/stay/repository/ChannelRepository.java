package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.Channel;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ChannelRepository extends JpaRepository<Channel, Long> {

    Optional<Channel> findByFeedToken(String feedToken);

    List<Channel> findByRoomTypeId(Long roomTypeId);

    List<Channel> findByRoomTypeIdAndIsActiveTrue(Long roomTypeId);

    List<Channel> findByIsActiveTrue();

    @Query("SELECT c FROM Channel c WHERE c.isActive = true AND " +
           "(c.lastSyncedAt IS NULL OR c.lastSyncedAt <= :cutoffTime)")
    List<Channel> findChannelsDueForSync(@Param("cutoffTime") LocalDateTime cutoffTime);
}
