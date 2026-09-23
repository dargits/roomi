package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.BackupConfigDto;
import plant.stay.dto.response.BackupHistoryDto;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.UserRepository;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class BackupServiceTest {

    @Autowired
    private BackupService backupService;

    @Autowired
    private UserRepository userRepository;

    private User ownerUser;

    @BeforeEach
    void setUp() {
        ownerUser = userRepository.findByAccount("owner_test_acc")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Chủ Cơ Sở")
                        .account("owner_test_acc")
                        .email("owner@stayaway.vn")
                        .password("pass123")
                        .role(Role.OWNER)
                        .phone("0909999999")
                        .build()));
    }

    @Test
    @DisplayName("Lấy cấu hình tự động sao lưu mặc định thành công")
    void testGetBackupConfig() {
        BackupConfigDto config = backupService.getConfig();
        assertNotNull(config);
        assertNotNull(config.getAutoBackupEnabled());
        assertNotNull(config.getAutoBackupTime());
        assertTrue(config.getBackupRetentionDays() >= 1);
    }

    @Test
    @DisplayName("Cập nhật cấu hình tự động sao lưu và thời gian lưu trữ")
    void testUpdateBackupConfig() {
        BackupConfigDto updateDto = BackupConfigDto.builder()
                .autoBackupEnabled(true)
                .autoBackupTime("03:30")
                .backupRetentionDays(45)
                .build();

        BackupConfigDto updated = backupService.updateConfig(updateDto, ownerUser);
        assertNotNull(updated);
        assertTrue(updated.getAutoBackupEnabled());
        assertEquals("03:30", updated.getAutoBackupTime());
        assertEquals(45, updated.getBackupRetentionDays());
    }

    @Test
    @DisplayName("Tạo bản sao lưu toàn bộ hệ thống và quản lý lịch sử")
    void testCreateAndManageBackup() {
        // 1. Tạo bản sao lưu FULL_ZIP
        BackupHistoryDto backup = backupService.createBackup(ownerUser, "FULL_ZIP");
        assertNotNull(backup);
        assertNotNull(backup.getId());
        assertNotNull(backup.getFileName());
        assertTrue(backup.getFileName().endsWith(".zip"));
        assertEquals("SUCCESS", backup.getStatus());
        assertNotNull(backup.getChecksum());
        assertFalse(backup.getChecksum().isEmpty());

        // 2. Kiểm tra danh sách bản sao lưu
        List<BackupHistoryDto> list = backupService.listBackups();
        assertNotNull(list);
        assertFalse(list.isEmpty());
        assertTrue(list.stream().anyMatch(b -> b.getId().equals(backup.getId())));

        // 3. Xóa bản sao lưu
        assertDoesNotThrow(() -> backupService.deleteBackup(backup.getId(), ownerUser));
    }
}
