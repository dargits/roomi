package plant.stay.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import plant.stay.service.RoomService;

@Component
@Slf4j
@RequiredArgsConstructor
public class PeriodicCleaningScheduler {

    private final RoomService roomService;

    /**
     * Quét định kỳ kiểm tra các phòng trống lâu ngày không có khách.
     * Chạy mỗi đầu giờ để tự động cập nhật phòng sang trạng thái DIRTY (cần dọn)
     * nếu số ngày trống vượt quá chu kỳ mà Chủ cơ sở đã cấu hình.
     */
    @Scheduled(cron = "0 0 * * * ?", zone = "${app.time-zone:Asia/Ho_Chi_Minh}")
    public void scanOverdueVacantRooms() {
        try {
            log.info("[SCHEDULER] Bắt đầu quét định kỳ phòng trống dài ngày...");
            int movedCount = roomService.triggerPeriodicCleaningCheck(null);
            if (movedCount > 0) {
                log.info("[SCHEDULER] Đã tự động chuyển {} phòng trống lâu ngày sang trạng thái Cần dọn (DIRTY)", movedCount);
            } else {
                log.info("[SCHEDULER] Quét hoàn tất. Không có phòng trống nào vượt quá chu kỳ cần dọn.");
            }
        } catch (Exception e) {
            log.error("[SCHEDULER] Lỗi khi thực hiện quét dọn định kỳ phòng trống: {}", e.getMessage(), e);
        }
    }
}
