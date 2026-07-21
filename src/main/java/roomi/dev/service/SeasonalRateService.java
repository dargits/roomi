package roomi.dev.service;

import roomi.dev.dto.request.SeasonalRateRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.PriceLookupResponse;
import roomi.dev.dto.response.SeasonalRateResponse;

import java.time.LocalDate;
import java.util.List;

public interface SeasonalRateService {
    BaseResponse<List<SeasonalRateResponse>> getAllSeasonalRates();
    BaseResponse<List<SeasonalRateResponse>> getSeasonalRatesByRoomType(Long roomTypeId);
    BaseResponse<SeasonalRateResponse> getSeasonalRateById(Long id);
    BaseResponse<SeasonalRateResponse> createSeasonalRate(SeasonalRateRequest request);
    BaseResponse<SeasonalRateResponse> updateSeasonalRate(Long id, SeasonalRateRequest request);
    BaseResponse<Void> deleteSeasonalRate(Long id);
    BaseResponse<PriceLookupResponse> getPriceByDate(Long roomTypeId, LocalDate date);
}