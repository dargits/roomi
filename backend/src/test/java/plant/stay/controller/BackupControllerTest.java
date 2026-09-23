package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import plant.stay.dto.request.BackupConfigDto;
import plant.stay.dto.response.BackupHistoryDto;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.BackupService;
import plant.stay.util.AuthUtil;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

public class BackupControllerTest {

    @Test
    @DisplayName("OWNER và ADMIN được phép truy cập danh sách sao lưu")
    public void testOwnerAndAdminCanListBackups() {
        BackupService backupService = Mockito.mock(BackupService.class);
        AuthUtil authUtil = Mockito.mock(AuthUtil.class);
        BackupController controller = new BackupController(backupService, authUtil);

        User mockOwner = new User();
        mockOwner.setRole(Role.OWNER);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);
        Mockito.when(backupService.listBackups()).thenReturn(Collections.emptyList());

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        ResponseEntity<List<BackupHistoryDto>> response = controller.listBackups(request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("Nhân viên lễ tân RECEPTIONIST bị từ chối truy cập sao lưu")
    public void testReceptionistCannotAccessBackups() {
        BackupService backupService = Mockito.mock(BackupService.class);
        AuthUtil authUtil = Mockito.mock(AuthUtil.class);
        BackupController controller = new BackupController(backupService, authUtil);

        User mockStaff = new User();
        mockStaff.setRole(Role.RECEPTIONIST);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockStaff);

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        assertThrows(UnauthorizedException.class, () -> controller.listBackups(request));
    }

    @Test
    @DisplayName("Khôi phục hệ thống bắt buộc phải có từ khóa RESTORE")
    public void testRestoreRequiresConfirmCode() {
        BackupService backupService = Mockito.mock(BackupService.class);
        AuthUtil authUtil = Mockito.mock(AuthUtil.class);
        BackupController controller = new BackupController(backupService, authUtil);

        User mockOwner = new User();
        mockOwner.setRole(Role.OWNER);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);

        // Sai mã xác nhận
        assertThrows(UnauthorizedException.class, () -> {
            controller.restoreBackup(1L, "WRONG_CODE", request);
        });
    }

    @Test
    @DisplayName("OWNER có quyền cập nhật cấu hình tự động sao lưu")
    public void testOwnerCanUpdateConfig() {
        BackupService backupService = Mockito.mock(BackupService.class);
        AuthUtil authUtil = Mockito.mock(AuthUtil.class);
        BackupController controller = new BackupController(backupService, authUtil);

        User mockOwner = new User();
        mockOwner.setRole(Role.OWNER);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);

        BackupConfigDto dto = BackupConfigDto.builder()
                .autoBackupEnabled(true)
                .autoBackupTime("02:00")
                .backupRetentionDays(30)
                .build();

        Mockito.when(backupService.updateConfig(any(), any())).thenReturn(dto);

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        ResponseEntity<BackupConfigDto> response = controller.updateConfig(dto, request);

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().getAutoBackupEnabled());
    }
}
