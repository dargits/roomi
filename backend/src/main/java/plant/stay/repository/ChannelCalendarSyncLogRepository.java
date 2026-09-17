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

    List<ChannelCalendarSyncLog> findTop100ByOrderBySyncedAtDesc();

    long countBySyncedAtAfter(java.time.LocalDateTime time);

    long countByStatusAndSyncedAtAfter(String status, java.time.LocalDateTime time);

    @org.springframework.data.jpa.repository.Query("SELECT l FROM ChannelCalendarSyncLog l WHERE " +
            "(:channelId IS NULL OR l.channel.id = :channelId) AND " +
            "(:status IS NULL OR l.status = :status) AND " +
            "(:triggeredBy IS NULL OR l.triggeredBy = :triggeredBy) " +
            "ORDER BY l.syncedAt DESC")
    List<ChannelCalendarSyncLog> findByFilters(
            @org.springframework.data.repository.query.Param("channelId") Long channelId,
            @org.springframework.data.repository.query.Param("status") String status,
            @org.springframework.data.repository.query.Param("triggeredBy") String triggeredBy);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("DELETE FROM ChannelCalendarSyncLog l WHERE l.channel.id = :channelId")
    void deleteByChannelId(@org.springframework.data.repository.query.Param("channelId") Long channelId);
}
