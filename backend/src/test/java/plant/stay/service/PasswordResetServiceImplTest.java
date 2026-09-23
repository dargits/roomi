package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import plant.stay.dto.request.ForceChangePasswordRequest;
import plant.stay.dto.request.ResetPasswordWithTokenRequest;
import plant.stay.dto.response.AccountCheckResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.VerifyResetTokenResponse;
import plant.stay.exception.BusinessException;
import plant.stay.model.PasswordResetRequest;
import plant.stay.model.PasswordResetStatus;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.PasswordResetRequestRepository;
import plant.stay.repository.UserRepository;
import plant.stay.service.impl.PasswordResetServiceImpl;
import plant.stay.util.HashUtil;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class PasswordResetServiceImplTest {

    private PasswordResetRequestRepository passwordResetRequestRepository;
    private UserRepository userRepository;
    private AuditLogService auditLogService;
    private EmailService emailService;
    private PasswordResetServiceImpl passwordResetService;

    private User mockUser;

    @BeforeEach
    public void setUp() {
        passwordResetRequestRepository = mock(PasswordResetRequestRepository.class);
        userRepository = mock(UserRepository.class);
        auditLogService = mock(AuditLogService.class);
        emailService = mock(EmailService.class);

        passwordResetService = new PasswordResetServiceImpl(
                passwordResetRequestRepository,
                userRepository,
                auditLogService,
                emailService
        );

        mockUser = new User();
        mockUser.setId(5L);
        mockUser.setAccount("staff_user");
        mockUser.setName("Staff User");
        mockUser.setEmail("staff@example.com");
        mockUser.setPassword(HashUtil.hashPassword("TempPass@123"));
        mockUser.setActive(true);
        mockUser.setRole(Role.RECEPTIONIST);
        mockUser.setMustChangePassword(true);
    }

    @Test
    @DisplayName("Test: checkAccount returns exists=true when user found")
    public void testCheckAccountSuccess() {
        when(userRepository.findByAccount("staff_user")).thenReturn(Optional.of(mockUser));

        AccountCheckResponse res = passwordResetService.checkAccount("staff_user");
        assertTrue(res.isExists());
        assertTrue(res.isActive());
        assertEquals("Staff User", res.getName());
    }

    @Test
    @DisplayName("Test: checkAccount returns exists=false when user not found")
    public void testCheckAccountNotFound() {
        when(userRepository.findByAccount("unknown")).thenReturn(Optional.empty());

        AccountCheckResponse res = passwordResetService.checkAccount("unknown");
        assertFalse(res.isExists());
    }

    @Test
    @DisplayName("Test: verifyResetToken returns valid=true for active non-expired token")
    public void testVerifyResetTokenValid() {
        PasswordResetRequest req = PasswordResetRequest.builder()
                .id(1L)
                .account("staff_user")
                .user(mockUser)
                .resetToken("valid-token")
                .status(PasswordResetStatus.ISSUED)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();

        when(passwordResetRequestRepository.findByResetToken("valid-token")).thenReturn(Optional.of(req));

        VerifyResetTokenResponse res = passwordResetService.verifyResetToken("valid-token");
        assertTrue(res.isValid());
        assertEquals("staff_user", res.getAccount());
    }

    @Test
    @DisplayName("Test: verifyResetToken returns valid=false when token expired")
    public void testVerifyResetTokenExpired() {
        PasswordResetRequest req = PasswordResetRequest.builder()
                .id(2L)
                .account("staff_user")
                .user(mockUser)
                .resetToken("expired-token")
                .status(PasswordResetStatus.ISSUED)
                .expiresAt(LocalDateTime.now().minusMinutes(5))
                .build();

        when(passwordResetRequestRepository.findByResetToken("expired-token")).thenReturn(Optional.of(req));

        VerifyResetTokenResponse res = passwordResetService.verifyResetToken("expired-token");
        assertFalse(res.isValid());
        assertTrue(res.getMessage().contains("hết hiệu lực"));
    }

    @Test
    @DisplayName("Test: resetPasswordWithToken updates user password and marks request USED")
    public void testResetPasswordWithTokenSuccess() {
        PasswordResetRequest req = PasswordResetRequest.builder()
                .id(3L)
                .account("staff_user")
                .user(mockUser)
                .resetToken("reset-token")
                .status(PasswordResetStatus.ISSUED)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();

        when(passwordResetRequestRepository.findByResetToken("reset-token")).thenReturn(Optional.of(req));

        ResetPasswordWithTokenRequest resetReq = new ResetPasswordWithTokenRequest();
        resetReq.setToken("reset-token");
        resetReq.setNewPassword("NewSecurePass@2026");
        resetReq.setConfirmPassword("NewSecurePass@2026");

        MessageResponse res = passwordResetService.resetPasswordWithToken(resetReq);
        assertNotNull(res);
        assertTrue(res.getMessage().contains("thành công"));
        assertEquals(PasswordResetStatus.USED, req.getStatus());
        assertTrue(HashUtil.checkPassword("NewSecurePass@2026", mockUser.getPassword()));
        verify(userRepository, times(1)).save(mockUser);
        verify(passwordResetRequestRepository, times(1)).save(req);
    }

    @Test
    @DisplayName("Test: forceChangePassword updates password when old temp password matches")
    public void testForceChangePasswordSuccess() {
        when(userRepository.findByAccount("staff_user")).thenReturn(Optional.of(mockUser));
        when(passwordResetRequestRepository.findFirstByUserIdAndStatusOrderByRequestedAtDesc(5L, PasswordResetStatus.ISSUED))
                .thenReturn(Optional.empty());

        ForceChangePasswordRequest req = new ForceChangePasswordRequest();
        req.setAccount("staff_user");
        req.setTempPassword("TempPass@123");
        req.setNewPassword("ChangedPassword@2026");
        req.setConfirmPassword("ChangedPassword@2026");

        MessageResponse res = passwordResetService.forceChangePassword(req);
        assertNotNull(res);
        assertTrue(HashUtil.checkPassword("ChangedPassword@2026", mockUser.getPassword()));
        assertFalse(mockUser.isMustChangePassword());
        verify(userRepository, times(1)).save(mockUser);
    }

    @Test
    @DisplayName("Test: forceChangePassword throws error when temp password is wrong")
    public void testForceChangePasswordWrongOldPassword() {
        when(userRepository.findByAccount("staff_user")).thenReturn(Optional.of(mockUser));

        ForceChangePasswordRequest req = new ForceChangePasswordRequest();
        req.setAccount("staff_user");
        req.setTempPassword("WrongTempPassword");
        req.setNewPassword("NewPassword@2026");
        req.setConfirmPassword("NewPassword@2026");

        assertThrows(IllegalArgumentException.class, () -> {
            passwordResetService.forceChangePassword(req);
        });
    }
}
