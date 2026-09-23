package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import plant.stay.dto.request.GrantExtraPermissionRequest;
import plant.stay.dto.request.RevokeExtraPermissionRequest;
import plant.stay.dto.response.UserExtraPermissionDto;
import plant.stay.dto.response.UserPermissionOverviewResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.model.UserExtraPermission;
import plant.stay.repository.UserExtraPermissionRepository;
import plant.stay.repository.UserRepository;
import plant.stay.service.impl.UserPermissionServiceImpl;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class UserPermissionServiceImplTest {

    private UserExtraPermissionRepository userExtraPermissionRepository;
    private UserRepository userRepository;
    private AuditLogService auditLogService;
    private UserPermissionServiceImpl userPermissionService;

    private User mockAdmin;
    private User mockStaff;

    @BeforeEach
    public void setUp() {
        userExtraPermissionRepository = mock(UserExtraPermissionRepository.class);
        userRepository = mock(UserRepository.class);
        auditLogService = mock(AuditLogService.class);

        userPermissionService = new UserPermissionServiceImpl(
                userExtraPermissionRepository,
                userRepository,
                auditLogService
        );

        mockAdmin = new User();
        mockAdmin.setId(1L);
        mockAdmin.setName("Admin User");
        mockAdmin.setRole(Role.ADMIN);

        mockStaff = new User();
        mockStaff.setId(10L);
        mockStaff.setName("Staff Reception");
        mockStaff.setAccount("staff01");
        mockStaff.setRole(Role.RECEPTIONIST);
    }

    @Test
    @DisplayName("Test: getUserPermissions returns role defaults and empty extras")
    public void testGetUserPermissions() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(mockStaff));
        when(userExtraPermissionRepository.findByUserId(10L)).thenReturn(Collections.emptyList());

        UserPermissionOverviewResponse res = userPermissionService.getUserPermissions(10L);

        assertNotNull(res);
        assertEquals(10L, res.getUserId());
        assertEquals(Role.RECEPTIONIST, res.getRole());
        assertTrue(res.getRoleDefaultPermissions().size() > 0);
        assertTrue(res.getExtraPermissions().isEmpty());
    }

    @Test
    @DisplayName("Test: grantPermission successfully grants allowed view permission")
    public void testGrantPermissionSuccess() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(mockStaff));
        when(userExtraPermissionRepository.findActivePermission(eq(10L), eq("VIEW_REVENUE_REPORT"), any())).thenReturn(Optional.empty());

        GrantExtraPermissionRequest req = new GrantExtraPermissionRequest();
        req.setPermission("VIEW_REVENUE_REPORT");
        req.setExpiresAt(LocalDate.now().plusDays(7));
        req.setReason("Hỗ trợ đối soát doanh thu tuần");

        when(userExtraPermissionRepository.save(any(UserExtraPermission.class))).thenAnswer(inv -> {
            UserExtraPermission p = inv.getArgument(0);
            p.setId(100L);
            return p;
        });

        UserExtraPermissionDto dto = userPermissionService.grantPermission(10L, req, mockAdmin);

        assertNotNull(dto);
        assertEquals("VIEW_REVENUE_REPORT", dto.getPermission());
        assertFalse(dto.isExpired());
        assertFalse(dto.isRevoked());
        verify(auditLogService, times(1)).log(eq("UserExtraPermission"), eq(100L), eq("GRANT_EXTRA_PERMISSION"), eq(mockAdmin), anyString());
    }

    @Test
    @DisplayName("Test: grantPermission rejects disallowed or dangerous permissions")
    public void testGrantPermissionRejectsDisallowed() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(mockStaff));

        GrantExtraPermissionRequest req = new GrantExtraPermissionRequest();
        req.setPermission("APPROVE_REFUND"); // dangerous approval permission not allowed
        req.setReason("Test");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            userPermissionService.grantPermission(10L, req, mockAdmin);
        });

        assertTrue(ex.getMessage().contains("không nằm trong danh sách"));
    }

    @Test
    @DisplayName("Test: grantPermission rejects if already active")
    public void testGrantPermissionRejectsAlreadyActive() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(mockStaff));
        UserExtraPermission existing = UserExtraPermission.builder().id(50L).permission("VIEW_DEBTS").build();
        when(userExtraPermissionRepository.findActivePermission(eq(10L), eq("VIEW_DEBTS"), any())).thenReturn(Optional.of(existing));

        GrantExtraPermissionRequest req = new GrantExtraPermissionRequest();
        req.setPermission("VIEW_DEBTS");
        req.setReason("Duplicate grant");

        assertThrows(IllegalArgumentException.class, () -> {
            userPermissionService.grantPermission(10L, req, mockAdmin);
        });
    }

    @Test
    @DisplayName("Test: revokePermission revokes active permission with reason")
    public void testRevokePermissionSuccess() {
        UserExtraPermission perm = UserExtraPermission.builder()
                .id(100L)
                .user(mockStaff)
                .permission("VIEW_REVENUE_REPORT")
                .isRevoked(false)
                .build();

        when(userExtraPermissionRepository.findById(100L)).thenReturn(Optional.of(perm));

        RevokeExtraPermissionRequest revokeReq = new RevokeExtraPermissionRequest();
        revokeReq.setReason("Hết kỳ kiểm toán");

        userPermissionService.revokePermission(10L, 100L, revokeReq, mockAdmin);

        assertTrue(perm.getIsRevoked());
        assertEquals("Hết kỳ kiểm toán", perm.getRevokeReason());
        assertEquals(mockAdmin, perm.getRevokedBy());
        verify(userExtraPermissionRepository, times(1)).save(perm);
        verify(auditLogService, times(1)).log(eq("UserExtraPermission"), eq(100L), eq("REVOKE_EXTRA_PERMISSION"), eq(mockAdmin), anyString());
    }
}
