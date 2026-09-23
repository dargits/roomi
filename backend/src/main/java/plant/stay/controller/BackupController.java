package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import plant.stay.dto.request.BackupConfigDto;
import plant.stay.dto.response.BackupHistoryDto;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.RestoreSummaryDto;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.BackupService;
import plant.stay.util.AuthUtil;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/v1/backup")
@CrossOrigin("*")
@RequiredArgsConstructor
@Slf4j
public class BackupController {

    private final BackupService backupService;
    private final AuthUtil authUtil;

    /**
     * Tạo bản sao lưu toàn bộ hệ thống ngay lập tức trên máy chủ
     */
    @PostMapping("/create")
    public ResponseEntity<BackupHistoryDto> createBackup(@RequestParam(defaultValue = "FULL_ZIP") String type,
                                                        HttpServletRequest request) {
        User actor = checkAdmin(request);
        BackupHistoryDto history = backupService.createBackup(actor, type);
        return ResponseEntity.ok(history);
    }

    /**
     * Stream tải về trực tiếp file ZIP sao lưu toàn bộ hệ thống
     */
    @GetMapping("/instant-download")
    public void instantDownload(HttpServletRequest request, HttpServletResponse response) {
        User actor = checkAdmin(request);
        try {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmmss"));
            String fileName = "stayaway_full_backup_" + timestamp + ".zip";

            response.setContentType("application/zip");
            response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"");

            backupService.streamInstantBackup(actor, response.getOutputStream());
            response.flushBuffer();
        } catch (Exception e) {
            log.error("Lỗi khi stream tải bản sao lưu tức thì: ", e);
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Lấy danh sách lịch sử tất cả các bản sao lưu trên máy chủ
     */
    @GetMapping("/list")
    public ResponseEntity<List<BackupHistoryDto>> listBackups(HttpServletRequest request) {
        checkAdmin(request);
        return ResponseEntity.ok(backupService.listBackups());
    }

    /**
     * Tải về file sao lưu đã lưu trên máy chủ
     */
    @GetMapping("/download/{id}")
    public ResponseEntity<Resource> downloadBackup(@PathVariable Long id, HttpServletRequest request) {
        checkAdmin(request);
        Resource resource = backupService.getBackupResource(id);

        String filename = resource.getFilename();
        String contentType = (filename != null && filename.endsWith(".sql")) ? "application/sql" : "application/zip";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }

    /**
     * Xóa một bản sao lưu trên máy chủ
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteBackup(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkAdmin(request);
        backupService.deleteBackup(id, actor);
        return ResponseEntity.ok(new MessageResponse("Đã xóa bản sao lưu thành công"));
    }

    /**
     * Khôi phục toàn bộ hệ thống từ bản sao lưu đã có trên máy chủ (Chỉ OWNER)
     */
    @PostMapping("/restore/{id}")
    public ResponseEntity<RestoreSummaryDto> restoreBackup(@PathVariable Long id,
                                                           @RequestParam(defaultValue = "") String confirmCode,
                                                           HttpServletRequest request) {
        User actor = checkOwner(request);
        if (!"RESTORE".equalsIgnoreCase(confirmCode.trim())) {
            throw new UnauthorizedException("Vui lòng nhập chính xác từ khóa 'RESTORE' để xác nhận khôi phục hệ thống");
        }
        RestoreSummaryDto result = backupService.restoreBackup(id, actor);
        return ResponseEntity.ok(result);
    }

    /**
     * Khôi phục toàn bộ hệ thống từ file .sql hoặc .zip tải lên (Chỉ OWNER)
     */
    @PostMapping("/restore-upload")
    public ResponseEntity<RestoreSummaryDto> restoreUpload(@RequestParam("file") MultipartFile file,
                                                           @RequestParam(defaultValue = "") String confirmCode,
                                                           HttpServletRequest request) {
        User actor = checkOwner(request);
        if (!"RESTORE".equalsIgnoreCase(confirmCode.trim())) {
            throw new UnauthorizedException("Vui lòng nhập chính xác từ khóa 'RESTORE' để xác nhận khôi phục hệ thống");
        }
        RestoreSummaryDto result = backupService.restoreFromUpload(file, actor);
        return ResponseEntity.ok(result);
    }

    /**
     * Lấy cấu hình tự động sao lưu định kỳ & thông số lưu trữ
     */
    @GetMapping("/config")
    public ResponseEntity<BackupConfigDto> getConfig(HttpServletRequest request) {
        checkAdmin(request);
        return ResponseEntity.ok(backupService.getConfig());
    }

    /**
     * Cập nhật cấu hình tự động sao lưu định kỳ (Chỉ OWNER)
     */
    @PutMapping("/config")
    public ResponseEntity<BackupConfigDto> updateConfig(@RequestBody BackupConfigDto dto, HttpServletRequest request) {
        User actor = checkOwner(request);
        return ResponseEntity.ok(backupService.updateConfig(dto, actor));
    }

    // ==========================================
    // PHÂN QUYỀN TRUY CẬP
    // ==========================================
    private User checkAdmin(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở (OWNER) hoặc Quản trị viên (ADMIN) mới có quyền truy cập sao lưu hệ thống");
        }
        return user;
    }

    private User checkOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || user.getRole() != Role.OWNER) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở (OWNER) mới có quyền thực hiện thao tác này");
        }
        return user;
    }
}
