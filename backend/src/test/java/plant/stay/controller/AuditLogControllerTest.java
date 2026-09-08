package plant.stay.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.AuditLogRepository;
import plant.stay.util.AuthUtil;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

public class AuditLogControllerTest {

    @Test
    @DisplayName("Test 1: User co role OWNER thi duoc phep truy cap")
    public void testOwnerCanAccessAuditLogs() {
        // Khởi tạo các class giả (Mock)
        AuthUtil authUtil = Mockito.mock(AuthUtil.class);
        AuditLogRepository auditLogRepository = Mockito.mock(AuditLogRepository.class);
        AuditLogController controller = new AuditLogController(auditLogRepository, authUtil);

        // Kịch bản: AuthUtil trả về User có quyền OWNER
        User mockOwner = new User();
        mockOwner.setRole(Role.OWNER);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);
        Mockito.when(auditLogRepository.findWithFilters(any(), any(), any(), any())).thenReturn(Collections.emptyList());

        // Thực thi
        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        ResponseEntity<?> response = controller.getAll(null, null, null, null, request);

        // Kiểm tra
        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    @DisplayName("Test 2: User co role RECEPTIONIST thi bi cam")
    public void testStaffCannotAccessAuditLogs() {
        AuthUtil authUtil = Mockito.mock(AuthUtil.class);
        AuditLogRepository auditLogRepository = Mockito.mock(AuditLogRepository.class);
        AuditLogController controller = new AuditLogController(auditLogRepository, authUtil);

        // Kịch bản: AuthUtil trả về User có quyền RECEPTIONIST
        User mockStaff = new User();
        mockStaff.setRole(Role.RECEPTIONIST);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockStaff);

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);

        // Kiểm tra: Hàm phải ném ra lỗi UnauthorizedException
        assertThrows(UnauthorizedException.class, () -> {
            controller.getAll(null, null, null, null, request);
        });
    }

    @Test
    @DisplayName("Test 3: Khong co User (Chua gui Token) thi bi cam")
    public void testUnauthenticatedUserCannotAccess() {
        AuthUtil authUtil = Mockito.mock(AuthUtil.class);
        AuditLogRepository auditLogRepository = Mockito.mock(AuditLogRepository.class);
        AuditLogController controller = new AuditLogController(auditLogRepository, authUtil);

        // Kịch bản: Không tìm thấy User
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(null);

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);

        // Kiểm tra: Hàm phải ném ra lỗi UnauthorizedException
        assertThrows(UnauthorizedException.class, () -> {
            controller.getAll(null, null, null, null, request);
        });
    }
}
