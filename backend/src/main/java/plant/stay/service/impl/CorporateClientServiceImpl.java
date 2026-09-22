package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.CorporateClientRequest;
import plant.stay.dto.response.CorporateClientResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.CorporateClient;
import plant.stay.model.User;
import plant.stay.repository.CorporateClientRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.CorporateClientService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CorporateClientServiceImpl implements CorporateClientService {

    private final CorporateClientRepository corporateClientRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public List<CorporateClientResponse> getAll(String search, Boolean activeOnly) {
        List<CorporateClient> clients;
        if (search != null && !search.trim().isEmpty()) {
            clients = corporateClientRepository.search(search.trim());
            if (Boolean.TRUE.equals(activeOnly)) {
                clients = clients.stream().filter(c -> Boolean.TRUE.equals(c.getActive())).collect(Collectors.toList());
            }
        } else if (Boolean.TRUE.equals(activeOnly)) {
            clients = corporateClientRepository.findByActiveTrueOrderByIdDesc();
        } else {
            clients = corporateClientRepository.findAllByOrderByIdDesc();
        }

        return clients.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CorporateClientResponse getById(Long id) {
        CorporateClient client = corporateClientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng công ty có ID: " + id));
        return toResponse(client);
    }

    @Override
    public CorporateClientResponse create(CorporateClientRequest request, User actor) {
        CorporateClient client = CorporateClient.builder()
                .companyName(request.getCompanyName())
                .taxCode(request.getTaxCode())
                .contactPerson(request.getContactPerson())
                .contactPhone(request.getContactPhone())
                .contactEmail(request.getContactEmail())
                .address(request.getAddress())
                .note(request.getNote())
                .active(request.getActive() != null ? request.getActive() : true)
                .createdBy(actor)
                .build();

        CorporateClient saved = corporateClientRepository.save(client);
        auditLogService.log("CorporateClient", saved.getId(), "CREATE", actor,
                "Tạo mới hồ sơ khách công ty: " + saved.getCompanyName());

        return toResponse(saved);
    }

    @Override
    public CorporateClientResponse update(Long id, CorporateClientRequest request, User actor) {
        CorporateClient client = corporateClientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng công ty có ID: " + id));

        client.setCompanyName(request.getCompanyName());
        client.setTaxCode(request.getTaxCode());
        client.setContactPerson(request.getContactPerson());
        client.setContactPhone(request.getContactPhone());
        client.setContactEmail(request.getContactEmail());
        client.setAddress(request.getAddress());
        client.setNote(request.getNote());
        if (request.getActive() != null) {
            client.setActive(request.getActive());
        }

        CorporateClient saved = corporateClientRepository.save(client);
        auditLogService.log("CorporateClient", saved.getId(), "UPDATE", actor,
                "Cập nhật hồ sơ khách công ty: " + saved.getCompanyName());

        return toResponse(saved);
    }

    @Override
    public void delete(Long id, User actor) {
        CorporateClient client = corporateClientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng công ty có ID: " + id));

        // Soft delete bằng cách set active = false
        client.setActive(false);
        corporateClientRepository.save(client);
        auditLogService.log("CorporateClient", client.getId(), "DEACTIVATE", actor,
                "Vô hiệu hóa hồ sơ khách công ty: " + client.getCompanyName());
    }

    private CorporateClientResponse toResponse(CorporateClient c) {
        return CorporateClientResponse.builder()
                .id(c.getId())
                .companyName(c.getCompanyName())
                .taxCode(c.getTaxCode())
                .contactPerson(c.getContactPerson())
                .contactPhone(c.getContactPhone())
                .contactEmail(c.getContactEmail())
                .address(c.getAddress())
                .note(c.getNote())
                .active(c.getActive())
                .createdById(c.getCreatedBy() != null ? c.getCreatedBy().getId() : null)
                .createdByName(c.getCreatedBy() != null ? c.getCreatedBy().getName() : null)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
