package plant.stay.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import plant.stay.service.ChannelCalendarSyncService;

@Component
@Slf4j
@RequiredArgsConstructor
public class ChannelCalendarScheduler {

    private final ChannelCalendarSyncService channelCalendarSyncService;

    /**
     * Tự động quét theo chu kỳ (mỗi phút một lần) để kiểm tra các kênh phân phối
     * đã đến hạn chu kỳ cấu hình (syncIntervalMinutes) và sinh lại tệp lịch .ics.
     */
    @Scheduled(cron = "0 * * * * ?", zone = "${app.time-zone:Asia/Ho_Chi_Minh}")
    public void syncDueChannels() {
        try {
            channelCalendarSyncService.syncAllDueChannels();
        } catch (Exception e) {
            log.error("[SCHEDULER] Lỗi khi chạy tác vụ đồng bộ lịch kênh định kỳ: {}", e.getMessage(), e);
        }
    }
}
