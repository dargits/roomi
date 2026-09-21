package plant.stay.service;

import plant.stay.dto.request.DailyLedgerReopenRequest;
import plant.stay.dto.response.DailyLedgerResponse;
import plant.stay.model.User;

import java.time.LocalDate;
import java.util.List;

public interface DailyLedgerService {
    DailyLedgerResponse preview(LocalDate date, User actor);
    DailyLedgerResponse close(LocalDate date, User actor);
    DailyLedgerResponse reopen(LocalDate date, DailyLedgerReopenRequest request, User actor);
    List<DailyLedgerResponse> list(LocalDate from, LocalDate to, User actor);
}
