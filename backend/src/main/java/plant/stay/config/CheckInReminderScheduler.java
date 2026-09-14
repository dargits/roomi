package plant.stay.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import plant.stay.model.HotelSetting;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.service.BookingService;

import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

@Component
@Slf4j
@RequiredArgsConstructor
public class CheckInReminderScheduler {

    private final BookingService bookingService;
    private final HotelSettingRepository hotelSettingRepository;

    /**
     * Quét mỗi phút và đối chiếu thời gian theo cấu hình cài đặt cơ sở của chủ khách sạn.
     * Mặc định: Gửi 2 lần mỗi ngày (Sáng: 10:30, Tối: 19:00).
     * Chỉ gửi email nhắc nhở 1 ngày trước ngày nhận phòng và không gửi trùng lặp.
     */
    @Scheduled(cron = "0 * * * * ?", zone = "${app.time-zone:Asia/Ho_Chi_Minh}")
    public void checkAndSendReminders() {
        try {
            HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
            if (setting != null && Boolean.FALSE.equals(setting.getReminderEmailEnabled())) {
                return; // Tính năng gửi email nhắc nhở tự động đã bị tắt bởi chủ cơ sở
            }

            LocalTime now = LocalTime.now().truncatedTo(ChronoUnit.MINUTES);
            LocalTime morningTime = (setting != null && setting.getReminderMorningTime() != null)
                    ? setting.getReminderMorningTime().truncatedTo(ChronoUnit.MINUTES)
                    : LocalTime.of(10, 30);
            LocalTime eveningTime = (setting != null && setting.getReminderEveningTime() != null)
                    ? setting.getReminderEveningTime().truncatedTo(ChronoUnit.MINUTES)
                    : LocalTime.of(19, 0);

            if (now.equals(morningTime) || now.equals(eveningTime)) {
                log.info("[SCHEDULER] Đúng giờ cài đặt ({}): Tự động quét và gửi email nhắc khách hàng trước ngày nhận phòng...", now);
                bookingService.sendCheckInRemindersForTomorrow();
            }
        } catch (Exception exception) {
            log.error("[SCHEDULER] Không thể hoàn tất tác vụ gửi email nhắc nhận phòng", exception);
        }
    }
}
