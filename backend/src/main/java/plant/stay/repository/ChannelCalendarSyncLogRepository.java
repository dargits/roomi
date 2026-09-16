package plant.stay.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.ChannelCalendarSyncLog;

import java.util.List;

public interface ChannelCalendarSyncLogRepository extends JpaRepository<ChannelCalendarSyncLog, Long> {

    List<ChannelCalendarSyncLog> findByChannelIdOrderBySyncedAtDesc(Long channelId);

    Page<ChannelCalendarSyncLog> findByChannelId(Long channelId, Pageable pageable);

    List<ChannelCalendarSyncLog> findTop50ByOrderBySyncedAtDesc();

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("DELETE FROM ChannelCalendarSyncLog l WHERE l.channel.id = :channelId")
    void deleteByChannelId(@org.springframework.data.repository.query.Param("channelId") Long channelId);
}
