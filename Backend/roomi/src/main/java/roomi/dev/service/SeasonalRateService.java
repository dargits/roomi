package roomi.dev.service;

import roomi.dev.dto.request.SeasonalRateRequest;
import roomi.dev.model.SeasonalRate;

import roomi.dev.dto.response.PriceLookupResponse;
import java.time.LocalDate;
import java.util.List;

public interface SeasonalRateService {
    SeasonalRate createSeasonalRate(SeasonalRateRequest request);
    SeasonalRate updateSeasonalRate(Long id, SeasonalRateRequest request);
    void deleteSeasonalRate(Long id);
    List<SeasonalRate> getAllSeasonalRates();
    List<SeasonalRate> getSeasonalRatesByRoomType(Long roomTypeId);
    SeasonalRate getSeasonalRateById(Long id);
    PriceLookupResponse getPriceLookup(Long roomTypeId, LocalDate date);
}
