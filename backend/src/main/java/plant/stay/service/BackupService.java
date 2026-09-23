package plant.stay.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import plant.stay.dto.request.BackupConfigDto;
import plant.stay.dto.response.BackupHistoryDto;
import plant.stay.dto.response.RestoreSummaryDto;
import plant.stay.model.User;

import java.io.OutputStream;
import java.util.List;

public interface BackupService {

    /**
     * Tạo bản sao lưu toàn bộ hệ thống và lưu trữ trên máy chủ
     * @param actor Người thực hiện sao lưu (hoặc null nếu tự động)
     * @param backupType "FULL_ZIP" hoặc "DATABASE_SQL"
     */
    BackupHistoryDto createBackup(User actor, String backupType);

    /**
     * Stream trực tiếp gói sao lưu toàn bộ (.ZIP) về trình duyệt
     */
    void streamInstantBackup(User actor, OutputStream outputStream);

    /**
     * Lấy danh sách lịch sử tất cả các bản sao lưu trên máy chủ
     */
    List<BackupHistoryDto> listBackups();

    /**
     * Lấy resource file sao lưu để tải về
     */
    Resource getBackupResource(Long id);

    /**
     * Xóa một bản sao lưu trên máy chủ
     */
    void deleteBackup(Long id, User actor);

    /**
     * Khôi phục cơ sở dữ liệu từ bản sao lưu đã có trên máy chủ
     */
    RestoreSummaryDto restoreBackup(Long id, User actor);

    /**
     * Khôi phục cơ sở dữ liệu từ file .sql hoặc .zip tải lên từ máy khách
     */
    RestoreSummaryDto restoreFromUpload(MultipartFile file, User actor);

    /**
     * Lấy cấu hình tự động sao lưu và dung lượng lưu trữ
     */
    BackupConfigDto getConfig();

    /**
     * Cập nhật cấu hình tự động sao lưu định kỳ
     */
    BackupConfigDto updateConfig(BackupConfigDto dto, User actor);

    /**
     * Tự động xóa các bản sao lưu đã hết hạn lưu trữ
     */
    int purgeExpiredBackups();
}
