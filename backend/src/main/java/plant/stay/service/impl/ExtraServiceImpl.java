package plant.stay.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import plant.stay.dto.request.ExtraServiceRequest;
import plant.stay.dto.response.ExtraServiceResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.ExtraService;
import plant.stay.repository.ExtraServiceRepository;
import plant.stay.service.ExtraServiceService;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ExtraServiceImpl implements ExtraServiceService {

    @Autowired
    private ExtraServiceRepository repository;

    @Override
    public List<ExtraServiceResponse> getAllPublic() {
        return repository.findAllByActiveTrue().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<ExtraServiceResponse> getAllAdmin() {
        return repository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ExtraServiceResponse getById(Long id) {
        return mapToResponse(getServiceById(id));
    }

    @Override
    public ExtraServiceResponse create(ExtraServiceRequest request) {
        ExtraService service = ExtraService.builder()
                .name(request.getName())
                .description(request.getDescription())
                .unitPrice(request.getUnitPrice())
                .unit(request.getUnit())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();
        return mapToResponse(repository.save(service));
    }

    @Override
    public ExtraServiceResponse update(Long id, ExtraServiceRequest request) {
        ExtraService service = getServiceById(id);
        service.setName(request.getName());
        service.setDescription(request.getDescription());
        service.setUnitPrice(request.getUnitPrice());
        service.setUnit(request.getUnit());
        if (request.getActive() != null) {
            service.setActive(request.getActive());
        }
        return mapToResponse(repository.save(service));
    }

    @Override
    public MessageResponse delete(Long id) {
        ExtraService service = getServiceById(id);
        repository.delete(service);
        return new MessageResponse("Xóa dịch vụ phụ thu thành công");
    }

    private ExtraService getServiceById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ phụ thu"));
    }

    private ExtraServiceResponse mapToResponse(ExtraService service) {
        return ExtraServiceResponse.builder()
                .id(service.getId())
                .name(service.getName())
                .description(service.getDescription())
                .unitPrice(service.getUnitPrice())
                .unit(service.getUnit())
                .active(service.isActive())
                .createdAt(service.getCreatedAt())
                .updatedAt(service.getUpdatedAt())
                .build();
    }
}
