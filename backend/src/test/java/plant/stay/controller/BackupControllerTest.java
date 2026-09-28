package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import plant.stay.dto.request.BackupConfigDto;
import plant.stay.dto.response.BackupHistoryDto;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.BackupService;
import plant.stay.service.OperationalDataSeederService;
import plant.stay.service.ReseedOtpService;
import plant.stay.util.AuthUtil;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

public class BackupControllerTest {

    private BackupService backupService;
    private OperationalDataSeederService operationalDataSeederService;
    private ReseedOtpService reseedOtpService;
    private AuthUtil authUtil;
    private BackupController controller;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        backupService = Mockito.mock(BackupService.class);
        operationalDataSeederService = Mockito.mock(OperationalDataSeederService.class);
        reseedOtpService = Mockito.mock(ReseedOtpService.class);
        authUtil = Mockito.mock(AuthUtil.class);
        controller = new BackupController(backupService, operationalDataSeederService, reseedOtpService, authUtil);
        request = Mockito.mock(HttpServletRequest.class);
    }

    @Test
    @DisplayName("OWNER và ADMIN được phép truy cập danh sách sao lưu")
    public void testOwnerAndAdminCanListBackups() {
        User mockOwner = new User();
        mockOwner.setRole(Role.OWNER);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);
        Mockito.when(backupService.listBackups()).thenReturn(Collections.emptyList());

        ResponseEntity<List<BackupHistoryDto>> response = controller.listBackups(request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("Nhân viên lễ tân RECEPTIONIST bị từ chối truy cập sao lưu")
    public void testReceptionistCannotAccessBackups() {
        User mockStaff = new User();
        mockStaff.setRole(Role.RECEPTIONIST);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockStaff);

        assertThrows(UnauthorizedException.class, () -> controller.listBackups(request));
    }

    @Test
    @DisplayName("Khôi phục hệ thống bắt buộc phải có từ khóa RESTORE")
    public void testRestoreRequiresConfirmCode() {
        User mockOwner = new User();
        mockOwner.setRole(Role.OWNER);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);

        // Sai mã xác nhận
        assertThrows(UnauthorizedException.class, () -> {
            controller.restoreBackup(1L, "WRONG_CODE", request);
        });
    }

    @Test
    @DisplayName("OWNER có quyền cập nhật cấu hình tự động sao lưu")
    public void testOwnerCanUpdateConfig() {
        User mockOwner = new User();
        mockOwner.setRole(Role.OWNER);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);

        BackupConfigDto dto = BackupConfigDto.builder()
                .autoBackupEnabled(true)
                .autoBackupTime("02:00")
                .backupRetentionDays(30)
                .build();

        Mockito.when(backupService.updateConfig(any(), any())).thenReturn(dto);

        ResponseEntity<BackupConfigDto> response = controller.updateConfig(dto, request);

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().getAutoBackupEnabled());
    }

    @Test
    @DisplayName("Yêu cầu gửi OTP Telegram thành công cho OWNER")
    public void testRequestReseedOtpSuccess() {
        User mockOwner = new User();
        mockOwner.setRole(Role.OWNER);
        mockOwner.setAccount("owner");
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);

        ResponseEntity<MessageResponse> response = controller.requestReseedOtp(request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        Mockito.verify(reseedOtpService, Mockito.times(1)).generateAndSendOtp(any());
    }

    @Test
    @DisplayName("Tái tạo dữ liệu thất bại khi OTP không hợp lệ")
    public void testReseedSampleDataInvalidOtp() {
        User mockOwner = new User();
        mockOwner.setRole(Role.OWNER);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);
        Mockito.when(reseedOtpService.verifyOtp("123456")).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> {
            controller.reseedSampleData("123456", request);
        });
    }

    @Test
    @DisplayName("Tái tạo dữ liệu thành công khi OTP hợp lệ")
    public void testReseedSampleDataValidOtp() {
        User mockOwner = new User();
        mockOwner.setRole(Role.OWNER);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);
        Mockito.when(reseedOtpService.verifyOtp("654321")).thenReturn(true);
        Mockito.when(operationalDataSeederService.reseedOperationalData(any())).thenReturn(Collections.singletonMap("success", true));

        ResponseEntity<Map<String, Object>> response = controller.reseedSampleData("654321", request);

        assertEquals(200, response.getStatusCode().value());
        assertTrue((Boolean) response.getBody().get("success"));
        Mockito.verify(operationalDataSeederService, Mockito.times(1)).reseedOperationalData(mockOwner);
    }
}
