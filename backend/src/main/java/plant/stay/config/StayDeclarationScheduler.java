package plant.stay.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import plant.stay.dto.response.StayDeclarationResponseDTO;
import plant.stay.model.Role;
import plant.stay.service.StayDeclarationService;

@Component
@Slf4j
@RequiredArgsConstructor
public class StayDeclarationScheduler {

    private final StayDeclarationService stayDeclarationService;

    /** Nhắc lễ tân lúc 22:30 mỗi ngày nếu còn khách chưa khai báo hoặc thiếu giấy tờ. */
    @Scheduled(cron = "0 30 22 * * ?", zone = "${app.time-zone:Asia/Ho_Chi_Minh}")
    public void remindReceptionists() {
        // Scheduler chạy ngầm (không có user), dùng Role.OWNER để lấy dữ liệu đầy đủ chỉ để log
        StayDeclarationResponseDTO declarations = stayDeclarationService.getTodayDeclarations(Role.OWNER);
        if (declarations.getMissingDocumentGuests() > 0 || declarations.getPendingDeclarations() > 0) {
            log.warn("Stay-declaration reminder: date={}, missingDocuments={}, pendingDeclarations={}",
                    declarations.getDeclarationDate(),
                    declarations.getMissingDocumentGuests(),
                    declarations.getPendingDeclarations());
        }
    }
}