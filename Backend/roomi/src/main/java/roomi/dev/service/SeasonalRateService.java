package roomi.dev.service;

import roomi.dev.dto.request.SeasonalRateRequest;
import roomi.dev.model.SeasonalRate;

import java.util.List;

public interface SeasonalRateService {
    SeasonalRate createSeasonalRate(SeasonalRateRequest request);
    SeasonalRate updateSeasonalRate(Long id, SeasonalRateRequest request);
    void deleteSeasonalRate(Long id);
    List<SeasonalRate> getAllSeasonalRates();
    List<SeasonalRate> getSeasonalRatesByRoomType(Long roomTypeId);
    SeasonalRate getSeasonalRateById(Long id);
}
