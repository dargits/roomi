package plant.stay.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import plant.stay.service.BookingService;

@Component
@Slf4j
@RequiredArgsConstructor
public class CheckInReminderScheduler {

    private final BookingService bookingService;

    /**
     * Tự động gửi email nhắc nhở khách hàng 1 ngày trước ngày nhận phòng (Check-in).
     * Ví dụ: Khách nhận phòng ngày 15 thì email sẽ được gửi vào 10:30 sáng ngày 14.
     * Các ngày trong kỳ lưu trú (15-17) và sau đó sẽ không gửi email nữa.
     */
    @Scheduled(cron = "0 30 10 * * ?", zone = "${app.time-zone:Asia/Ho_Chi_Minh}")
    public void sendDailyCheckInReminders() {
        log.info("[SCHEDULER] Bắt đầu tác vụ tự động gửi email nhắc khách hàng trước ngày nhận phòng...");
        try {
            bookingService.sendCheckInRemindersForTomorrow();
        } catch (Exception exception) {
            log.error("[SCHEDULER] Không thể hoàn tất tác vụ gửi email nhắc nhận phòng", exception);
        }
    }
}
