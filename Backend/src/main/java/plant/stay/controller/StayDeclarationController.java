package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.response.StayDeclarationResponseDTO;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.StayDeclarationService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;

/**
 * NCL-12-CN-002: Danh sách khai báo lưu trú theo ngày
 * NCL-12-CN-003: Kết xuất Excel + ghi AuditLog
 * NCL-12-CN-004: Mask số giấy tờ theo vai trò (QTN-24) — thực hiện trong service
 */
@RestController
@RequestMapping("/api/v1/stay-declarations")
@CrossOrigin("*")
@RequiredArgsConstructor
public class StayDeclarationController {

    private final StayDeclarationService stayDeclarationService;
    private final AuthUtil authUtil;

    /**
     * NCL-12-CN-002: Lấy danh sách khai báo hôm nay.
     * Số giấy tờ được mask tự động theo vai trò (QTN-24).
     */
    @GetMapping("/today")
    public ResponseEntity<StayDeclarationResponseDTO> getToday(HttpServletRequest request) {
        User actor = checkReceptionStaff(request);
        return ResponseEntity.ok(stayDeclarationService.getTodayDeclarations(actor.getRole()));
    }

    /**
     * NCL-12-CN-002: Lấy danh sách khai báo theo ngày cụ thể.
     * Số giấy tờ được mask tự động theo vai trò (QTN-24).
     */
    @GetMapping
    public ResponseEntity<StayDeclarationResponseDTO> getByDate(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request) {
        User actor = checkReceptionStaff(request);
        LocalDate reportDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(stayDeclarationService.getDeclarationsForDate(reportDate, actor.getRole()));
    }

    /**
     * NCL-12-CN-003: Kết xuất Excel danh sách khai báo lưu trú.
     * Ghi AuditLog sau mỗi lần kết xuất (truy vết trách nhiệm theo QTN-24).
     * File Excel áp dụng mask số giấy tờ theo vai trò người kết xuất.
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request) {
        User actor = checkReceptionStaff(request);
        LocalDate reportDate = date != null ? date : LocalDate.now();
        byte[] report = stayDeclarationService.exportAndLogDeclarations(reportDate, actor);
        String filename = "khai_bao_luu_tru_" + reportDate + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(report);
    }

    /**
     * Đánh dấu đã hoàn tất khai báo lưu trú cho một booking.
     */
    @PutMapping("/{bookingId}/complete")
    public ResponseEntity<Void> complete(@PathVariable Long bookingId, HttpServletRequest request) {
        User actor = checkReceptionStaff(request);
        stayDeclarationService.completeDeclaration(bookingId, actor);
        return ResponseEntity.noContent().build();
    }

    private User checkReceptionStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER
                && user.getRole() != Role.RECEPTIONIST
                && user.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Không có quyền truy cập");
        }
        return user;
    }
}