package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import plant.stay.model.AuditLog;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.AuditLogRepository;
import plant.stay.service.impl.AuditLogServiceImpl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class AuditLogServiceImplTest {

    private AuditLogRepository auditLogRepository;
    private AuditLogServiceImpl auditLogService;

    @BeforeEach
    public void setUp() {
        auditLogRepository = mock(AuditLogRepository.class);
        auditLogService = new AuditLogServiceImpl(auditLogRepository);
    }

    @Test
    @DisplayName("Test: log saves audit log record with actor and details")
    public void testLogSuccess() {
        User user = new User();
        user.setId(1L);
        user.setName("Manager");
        user.setRole(Role.ADMIN);

        auditLogService.log("Booking", 123L, "CHECK_IN", user, "Check-in guest successfully");

        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }
}
