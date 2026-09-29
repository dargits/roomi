package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import plant.stay.dto.request.NegotiatedPriceAgreementRequest;
import plant.stay.dto.response.NegotiatedPriceAgreementResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.NegotiatedPriceService;
import plant.stay.util.AuthUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

public class NegotiatedPriceControllerSecurityTest {

    private NegotiatedPriceService negotiatedPriceService;
    private AuthUtil authUtil;
    private NegotiatedPriceController controller;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        negotiatedPriceService = Mockito.mock(NegotiatedPriceService.class);
        authUtil = Mockito.mock(AuthUtil.class);
        controller = new NegotiatedPriceController(negotiatedPriceService, authUtil);
        request = Mockito.mock(HttpServletRequest.class);
    }

    @Test
    @DisplayName("Chỉ OWNER mới được tạo thỏa thuận giá")
    void testOnlyOwnerCanCreateAgreement() {
        User owner = User.builder().id(1L).role(Role.OWNER).build();
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(owner);

        NegotiatedPriceAgreementRequest req = new NegotiatedPriceAgreementRequest();
        req.setName("Test Agreement");
        req.setPricePerNight(BigDecimal.valueOf(500000));
        req.setStartDate(LocalDate.now());
        req.setEndDate(LocalDate.now().plusDays(30));

        NegotiatedPriceAgreementResponse mockRes = NegotiatedPriceAgreementResponse.builder().id(100L).name("Test Agreement").build();
        Mockito.when(negotiatedPriceService.create(any(), eq(owner))).thenReturn(mockRes);

        ResponseEntity<NegotiatedPriceAgreementResponse> response = controller.create(req, request);
        assertEquals(201, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("Test Agreement", response.getBody().getName());
    }

    @Test
    @DisplayName("Role RECEPTIONIST bị cấm tạo hoặc sửa thỏa thuận giá")
    void testReceptionistCannotCreateOrUpdateAgreement() {
        User receptionist = User.builder().id(2L).role(Role.RECEPTIONIST).build();
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(receptionist);

        NegotiatedPriceAgreementRequest req = new NegotiatedPriceAgreementRequest();
        req.setName("Test Agreement");

        assertThrows(UnauthorizedException.class, () -> controller.create(req, request));
        assertThrows(UnauthorizedException.class, () -> controller.update(1L, req, request));
        assertThrows(UnauthorizedException.class, () -> controller.delete(1L, request));
    }

    @Test
    @DisplayName("Role ADMIN hoặc ACCOUNTANT bị cấm tạo hoặc sửa thỏa thuận giá (chỉ OWNER có quyền)")
    void testOtherRolesCannotMutateAgreement() {
        User admin = User.builder().id(3L).role(Role.ADMIN).build();
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(admin);

        NegotiatedPriceAgreementRequest req = new NegotiatedPriceAgreementRequest();
        assertThrows(UnauthorizedException.class, () -> controller.create(req, request));
        assertThrows(UnauthorizedException.class, () -> controller.update(1L, req, request));
        assertThrows(UnauthorizedException.class, () -> controller.delete(1L, request));

        User accountant = User.builder().id(4L).role(Role.ACCOUNTANT).build();
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(accountant);
        assertThrows(UnauthorizedException.class, () -> controller.create(req, request));
    }

    @Test
    @DisplayName("Role RECEPTIONIST và các role khác vẫn được xem danh sách thỏa thuận giá")
    void testReceptionistCanViewAgreements() {
        User receptionist = User.builder().id(2L).role(Role.RECEPTIONIST).build();
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(receptionist);
        Mockito.when(negotiatedPriceService.getAll(any(), any())).thenReturn(Collections.emptyList());

        ResponseEntity<?> response = controller.getAll(null, null, request);
        assertEquals(200, response.getStatusCode().value());
    }
}
