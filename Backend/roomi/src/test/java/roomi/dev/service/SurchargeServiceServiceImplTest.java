package roomi.dev.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import roomi.dev.dto.request.SurchargeServiceRequest;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.SurchargeService;
import roomi.dev.model.User;
import roomi.dev.repository.BookingSurchargeUsageRepository;
import roomi.dev.repository.SurchargeServiceRepository;
import roomi.dev.service.impl.SurchargeServiceServiceImpl;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SurchargeServiceServiceImplTest {
    @Mock SurchargeServiceRepository surchargeServiceRepository;
    @Mock BookingSurchargeUsageRepository usageRepository;

    private SurchargeServiceServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SurchargeServiceServiceImpl(surchargeServiceRepository, usageRepository);
    }

    @Test
    void create_asOwner_normalizesAndPersistsService() {
        SurchargeServiceRequest request = request("  Giặt ủi  ", "  Theo kg  ", "30000");
        when(surchargeServiceRepository.existsByNameIgnoreCase("Giặt ủi")).thenReturn(false);
        when(surchargeServiceRepository.save(any(SurchargeService.class))).thenAnswer(invocation -> {
            SurchargeService saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        var response = service.create(request, user(User.Role.OWNER));

        ArgumentCaptor<SurchargeService> captor = ArgumentCaptor.forClass(SurchargeService.class);
        verify(surchargeServiceRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Giặt ủi");
        assertThat(captor.getValue().getDescription()).isEqualTo("Theo kg");
        assertThat(captor.getValue().getUnitPrice()).isEqualByComparingTo("30000");
        assertThat(response.getId()).isEqualTo(1L);
    }

    @Test
    void create_asReceptionist_rejectsBeforePersistence() {
        assertThatThrownBy(() -> service.create(request("Nước uống", null, "10000"), user(User.Role.RECEPTIONIST)))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(ErrorCode.INSUFFICIENT_PRIVILEGES);
        verifyNoInteractions(surchargeServiceRepository, usageRepository);
    }

    @Test
    void delete_usedService_requiresDeactivationInstead() {
        SurchargeService surchargeService = SurchargeService.builder().id(3L).name("Xe đưa đón")
                .unitPrice(new BigDecimal("50000")).build();
        when(surchargeServiceRepository.findById(3L)).thenReturn(Optional.of(surchargeService));
        when(usageRepository.existsBySurchargeServiceId(3L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(3L, user(User.Role.OWNER)))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(ErrorCode.SURCHARGE_SERVICE_IN_USE);
        verify(surchargeServiceRepository, never()).delete(any());
    }

    @Test
    void reactivate_asOwner_marksInactiveServiceActive() {
        SurchargeService surchargeService = SurchargeService.builder().id(4L).name("Xe đưa đón")
                .unitPrice(new BigDecimal("50000")).active(false).build();
        when(surchargeServiceRepository.findById(4L)).thenReturn(Optional.of(surchargeService));
        when(surchargeServiceRepository.save(surchargeService)).thenReturn(surchargeService);

        var response = service.reactivate(4L, user(User.Role.OWNER));

        assertThat(response.getActive()).isTrue();
        verify(surchargeServiceRepository).save(surchargeService);
    }

    private SurchargeServiceRequest request(String name, String description, String unitPrice) {
        SurchargeServiceRequest request = new SurchargeServiceRequest();
        request.setName(name);
        request.setDescription(description);
        request.setUnitPrice(new BigDecimal(unitPrice));
        return request;
    }

    private User user(User.Role role) {
        return User.builder().id(1L).fullName("Owner").username("owner")
                .passwordHash("x").active(true).role(role).build();
    }
}
