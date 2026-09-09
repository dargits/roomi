package plant.stay.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import plant.stay.service.DebtApprovalService;

@Component
@Slf4j
@RequiredArgsConstructor
public class DebtReminderScheduler {

    private final DebtApprovalService debtApprovalService;

    @Scheduled(cron = "0 0 9 * * ?", zone = "${app.time-zone:Asia/Ho_Chi_Minh}")
    public void remindGuestsBeforeDueDate() {
        try {
            debtApprovalService.sendDueTomorrowReminders();
        } catch (Exception exception) {
            log.error("Không thể hoàn tất tác vụ nhắc công nợ trước hạn", exception);
        }
    }
}