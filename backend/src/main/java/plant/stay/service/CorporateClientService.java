package plant.stay.service;

import plant.stay.dto.request.CorporateClientRequest;
import plant.stay.dto.response.CorporateClientResponse;
import plant.stay.model.User;

import java.util.List;

public interface CorporateClientService {
    List<CorporateClientResponse> getAll(String search, Boolean activeOnly);
    CorporateClientResponse getById(Long id);
    CorporateClientResponse create(CorporateClientRequest request, User actor);
    CorporateClientResponse update(Long id, CorporateClientRequest request, User actor);
    void delete(Long id, User actor);
}
