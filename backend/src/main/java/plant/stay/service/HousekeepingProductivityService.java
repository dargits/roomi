package plant.stay.service;

import plant.stay.dto.request.CleaningStandardUpdateRequest;
import plant.stay.dto.response.CleaningStandardResponse;
import plant.stay.dto.response.HousekeepingProductivityReportResponse;
import plant.stay.model.User;

import java.time.LocalDate;
import java.util.List;

public interface HousekeepingProductivityService {

    List<CleaningStandardResponse> getCleaningStandards();

    List<CleaningStandardResponse> updateCleaningStandards(CleaningStandardUpdateRequest request, User actor);

    HousekeepingProductivityReportResponse getProductivityReport(
            String period,
            LocalDate date,
            LocalDate startDate,
            LocalDate endDate,
            User actor
    );
}
