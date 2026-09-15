package plant.stay.service;

import plant.stay.dto.response.InHouseFilterOptionsResponse;
import plant.stay.dto.response.InHouseGuestResponse;
import plant.stay.dto.response.InHouseSummaryResponse;
import plant.stay.model.User;

import java.util.List;

public interface InHouseGuestService {
    List<InHouseGuestResponse> getInHouseGuests(User actor);
    List<InHouseGuestResponse> getInHouseGuests(User actor, String floor, Long roomTypeId, Boolean checkingOutToday, Boolean hasDebt, String search);
    InHouseFilterOptionsResponse getFilterOptions();
    InHouseSummaryResponse getSummary(User actor);
}

