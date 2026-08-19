package plant.stay.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import plant.stay.dto.response.StayDeclarationResponseDTO;
import plant.stay.service.StayDeclarationService;

@Component
@Slf4j
@RequiredArgsConstructor
public class StayDeclarationScheduler {

    private final StayDeclarationService stayDeclarationService;

    @Scheduled(cron = "0 30 22 * * ?", zone = "${app.time-zone:Asia/Ho_Chi_Minh}")
    public void remindReceptionists() {
        StayDeclarationResponseDTO declarations = stayDeclarationService.getTodayDeclarations();
        if (declarations.getMissingDocumentGuests() > 0 || declarations.getPendingDeclarations() > 0) {
            log.warn("Stay-declaration reminder: date={}, missingDocuments={}, pendingDeclarations={}",
                    declarations.getDeclarationDate(),
                    declarations.getMissingDocumentGuests(),
                    declarations.getPendingDeclarations());
        }
    }
}