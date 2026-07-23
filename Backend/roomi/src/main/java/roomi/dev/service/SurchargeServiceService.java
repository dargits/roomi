package roomi.dev.service;

import roomi.dev.dto.request.SurchargeServiceRequest;
import roomi.dev.dto.response.SurchargeServiceResponse;
import roomi.dev.model.User;

import java.util.List;

public interface SurchargeServiceService {
    SurchargeServiceResponse create(SurchargeServiceRequest request, User currentUser);
    SurchargeServiceResponse update(Long id, SurchargeServiceRequest request, User currentUser);
    SurchargeServiceResponse deactivate(Long id, User currentUser);
    void delete(Long id, User currentUser);
    SurchargeServiceResponse getById(Long id);
    List<SurchargeServiceResponse> getAll(boolean activeOnly);
}
