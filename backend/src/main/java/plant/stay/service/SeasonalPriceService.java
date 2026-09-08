package plant.stay.service;

import plant.stay.dto.request.SeasonalPriceRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.SeasonalPriceResponse;

import java.util.List;

public interface SeasonalPriceService {
    List<SeasonalPriceResponse> getByRoomType(Long roomTypeId);
    SeasonalPriceResponse create(Long roomTypeId, SeasonalPriceRequest request);
    SeasonalPriceResponse update(Long roomTypeId, Long priceId, SeasonalPriceRequest request);
    MessageResponse delete(Long roomTypeId, Long priceId);
}
