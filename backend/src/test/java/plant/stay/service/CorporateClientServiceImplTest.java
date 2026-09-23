package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import plant.stay.dto.request.CorporateClientRequest;
import plant.stay.dto.response.CorporateClientResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.CorporateClient;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.CorporateClientRepository;
import plant.stay.service.impl.CorporateClientServiceImpl;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class CorporateClientServiceImplTest {

    private CorporateClientRepository corporateClientRepository;
    private AuditLogService auditLogService;
    private CorporateClientServiceImpl corporateClientService;

    private User mockActor;

    @BeforeEach
    public void setUp() {
        corporateClientRepository = mock(CorporateClientRepository.class);
        auditLogService = mock(AuditLogService.class);
        corporateClientService = new CorporateClientServiceImpl(corporateClientRepository, auditLogService);

        mockActor = new User();
        mockActor.setId(1L);
        mockActor.setAccount("admin");
        mockActor.setRole(Role.ADMIN);
    }

    @Test
    @DisplayName("Test: create corporate client successfully")
    public void testCreateClientSuccess() {
        CorporateClientRequest request = new CorporateClientRequest();
        request.setCompanyName("FPT Software");
        request.setTaxCode("0101234567");
        request.setContactPerson("Nguyen Van A");
        request.setContactPhone("0912345678");
        request.setContactEmail("contact@fpt.com");
        request.setAddress("Duy Tan, Cau Giay, Ha Noi");

        CorporateClient savedEntity = CorporateClient.builder()
                .id(10L)
                .companyName("FPT Software")
                .taxCode("0101234567")
                .contactPerson("Nguyen Van A")
                .contactPhone("0912345678")
                .contactEmail("contact@fpt.com")
                .address("Duy Tan, Cau Giay, Ha Noi")
                .active(true)
                .createdBy(mockActor)
                .build();

        when(corporateClientRepository.save(any(CorporateClient.class))).thenReturn(savedEntity);

        CorporateClientResponse response = corporateClientService.create(request, mockActor);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals("FPT Software", response.getCompanyName());
        assertTrue(response.getActive());
        verify(auditLogService, times(1)).log(eq("CorporateClient"), eq(10L), eq("CREATE"), eq(mockActor), anyString());
    }

    @Test
    @DisplayName("Test: getById returns client when found")
    public void testGetByIdSuccess() {
        CorporateClient client = CorporateClient.builder()
                .id(5L)
                .companyName("Viettel Group")
                .active(true)
                .build();

        when(corporateClientRepository.findById(5L)).thenReturn(Optional.of(client));

        CorporateClientResponse response = corporateClientService.getById(5L);
        assertNotNull(response);
        assertEquals(5L, response.getId());
        assertEquals("Viettel Group", response.getCompanyName());
    }

    @Test
    @DisplayName("Test: getById throws ResourceNotFoundException when not found")
    public void testGetByIdNotFound() {
        when(corporateClientRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            corporateClientService.getById(99L);
        });
    }

    @Test
    @DisplayName("Test: update corporate client successfully")
    public void testUpdateClientSuccess() {
        CorporateClient client = CorporateClient.builder()
                .id(5L)
                .companyName("Old Name")
                .active(true)
                .build();

        when(corporateClientRepository.findById(5L)).thenReturn(Optional.of(client));
        when(corporateClientRepository.save(any(CorporateClient.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CorporateClientRequest updateReq = new CorporateClientRequest();
        updateReq.setCompanyName("New Name Corp");
        updateReq.setTaxCode("9999999999");

        CorporateClientResponse response = corporateClientService.update(5L, updateReq, mockActor);

        assertEquals("New Name Corp", response.getCompanyName());
        assertEquals("9999999999", response.getTaxCode());
        verify(auditLogService, times(1)).log(eq("CorporateClient"), eq(5L), eq("UPDATE"), eq(mockActor), anyString());
    }

    @Test
    @DisplayName("Test: delete sets active = false (soft delete)")
    public void testDeleteSoftDelete() {
        CorporateClient client = CorporateClient.builder()
                .id(8L)
                .companyName("Vingroup")
                .active(true)
                .build();

        when(corporateClientRepository.findById(8L)).thenReturn(Optional.of(client));

        corporateClientService.delete(8L, mockActor);

        assertFalse(client.getActive());
        verify(corporateClientRepository, times(1)).save(client);
        verify(auditLogService, times(1)).log(eq("CorporateClient"), eq(8L), eq("DEACTIVATE"), eq(mockActor), anyString());
    }

    @Test
    @DisplayName("Test: getAll filters with search query")
    public void testGetAllWithSearch() {
        CorporateClient c1 = CorporateClient.builder().id(1L).companyName("Techcombank").active(true).build();
        when(corporateClientRepository.search("Tech")).thenReturn(List.of(c1));

        List<CorporateClientResponse> results = corporateClientService.getAll("Tech", false);
        assertEquals(1, results.size());
        assertEquals("Techcombank", results.get(0).getCompanyName());
    }
}
