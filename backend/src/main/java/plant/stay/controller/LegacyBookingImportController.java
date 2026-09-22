package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import plant.stay.dto.response.*;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.LegacyBookingImportService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bookings/import-legacy")
@CrossOrigin("*")
@RequiredArgsConstructor
public class LegacyBookingImportController {

    private final LegacyBookingImportService legacyBookingImportService;
    private final AuthUtil authUtil;

    /**
     * Tải về file mẫu Excel có cấu trúc cột chuẩn hóa
     */
    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] excelBytes = legacyBookingImportService.generateExcelTemplate();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Mau_Nhap_Dat_Phong_Cu.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    /**
     * Chạy kiểm tra trước dữ liệu tệp tải lên (Dry-run validation)
     */
    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LegacyBookingImportPreviewResponse> previewImport(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        checkStaffOrAdmin(request);
        return ResponseEntity.ok(legacyBookingImportService.previewImport(file));
    }

    /**
     * Xác nhận ghi dữ liệu vào hệ thống theo nguyên tắc trọn vẹn hoặc không gì cả
     */
    @PostMapping(value = "/commit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LegacyBookingImportCommitResponse> commitImport(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        User actor = checkAdminOrOwner(request);
        return ResponseEntity.ok(legacyBookingImportService.commitImport(file, actor));
    }

    /**
     * Lấy lịch sử các lần nhập dữ liệu
     */
    @GetMapping("/history")
    public ResponseEntity<List<BookingImportLogResponse>> getImportHistory(HttpServletRequest request) {
        checkStaffOrAdmin(request);
        return ResponseEntity.ok(legacyBookingImportService.getImportHistory());
    }

    private User checkAuth(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác");
        }
        return user;
    }

    private User checkStaffOrAdmin(HttpServletRequest request) {
        User user = checkAuth(request);
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN && user.getRole() != Role.RECEPTIONIST) {
            throw new UnauthorizedException("Bạn không có quyền truy cập tính năng nhập dữ liệu đặt phòng");
        }
        return user;
    }

    private User checkAdminOrOwner(HttpServletRequest request) {
        User user = checkAuth(request);
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Chỉ ADMIN hoặc OWNER mới có quyền xác nhận nhập dữ liệu đặt phòng cũ");
        }
        return user;
    }
}
