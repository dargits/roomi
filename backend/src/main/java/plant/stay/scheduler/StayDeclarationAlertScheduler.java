package plant.stay.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.model.Booking;
import plant.stay.model.NotificationType;
import plant.stay.repository.BookingRepository;
import plant.stay.service.NotificationService;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class StayDeclarationAlertScheduler {

    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    /**
     * Nhắc nhở lễ tân và quản lý lúc 21:00 hằng ngày nếu vẫn còn khách nhận phòng hôm nay
     * chưa hoàn tất thủ tục khai báo lưu trú trước deadline quy định (23:00) theo QTN-23.
     */
    @Scheduled(cron = "0 0 21 * * ?", zone = "${app.time-zone:Asia/Ho_Chi_Minh}")
    @Transactional(readOnly = true)
    public void alertPendingDeclarations() {
        LocalDate today = LocalDate.now();
        List<Booking> todayCheckins = bookingRepository.findCheckedInToday(today);
        if (!todayCheckins.isEmpty()) {
            String title = "⚠️ Cảnh báo hạn chót khai báo lưu trú (23:00)";
            String msg = "Còn " + todayCheckins.size() +
                    " lượt đặt phòng nhận hôm nay chưa hoàn tất khai báo lưu trú. Vui lòng nộp danh sách trước 23:00.";
            
            try {
                notificationService.createForRoles(
                        NotificationType.CHECKIN_TODAY,
                        title,
                        msg,
                        "STAY_DECLARATION",
                        null
                );
            } catch (Exception e) {
                log.error("Failed to broadcast stay declaration alert notification: {}", e.getMessage(), e);
            }

            log.info("Stay declaration alert: {} pending check-ins for date {}", todayCheckins.size(), today);
        }
    }
}
