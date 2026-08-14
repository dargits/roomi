package plant.stay.service;

import plant.stay.dto.request.ExtraServiceRequest;
import plant.stay.dto.response.ExtraServiceResponse;
import plant.stay.dto.response.MessageResponse;
import java.util.List;

public interface ExtraServiceService {
    List<ExtraServiceResponse> getAllPublic();
    List<ExtraServiceResponse> getAllAdmin();
    ExtraServiceResponse getById(Long id);
    ExtraServiceResponse create(ExtraServiceRequest request);
    ExtraServiceResponse update(Long id, ExtraServiceRequest request);
    MessageResponse delete(Long id);
}
