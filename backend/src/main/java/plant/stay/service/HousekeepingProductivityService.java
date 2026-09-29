package plant.stay.service;

import plant.stay.dto.response.HousekeepingProductivityResponse;
import plant.stay.model.User;

import java.time.LocalDate;

public interface HousekeepingProductivityService {

    HousekeepingProductivityResponse getProductivityReport(
            String period,
            LocalDate startDate,
            LocalDate endDate,
            Long housekeeperId,
            User currentUser
    );
}
