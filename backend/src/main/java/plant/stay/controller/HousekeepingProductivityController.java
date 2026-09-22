package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.CleaningStandardUpdateRequest;
import plant.stay.dto.response.CleaningStandardResponse;
import plant.stay.dto.response.HousekeepingProductivityReportResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.HousekeepingProductivityService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/housekeeping")
@CrossOrigin("*")
@RequiredArgsConstructor
public class HousekeepingProductivityController {

    private final HousekeepingProductivityService productivityService;
    private final AuthUtil authUtil;

    /**
     * Lấy danh sách định mức thời gian dọn của các loại phòng.
     */
    @GetMapping("/standards")
    public ResponseEntity<List<CleaningStandardResponse>> getCleaningStandards(HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(productivityService.getCleaningStandards());
    }

    /**
     * Cập nhật định mức thời gian dọn cho các loại phòng (Chỉ Chủ cơ sở & Admin).
     */
    @PutMapping("/standards")
    public ResponseEntity<List<CleaningStandardResponse>> updateCleaningStandards(
            @Valid @RequestBody CleaningStandardUpdateRequest requestBody,
            HttpServletRequest request
    ) {
        User actor = checkOwnerOrAdmin(request);
        return ResponseEntity.ok(productivityService.updateCleaningStandards(requestBody, actor));
    }

    /**
     * Báo cáo năng suất buồng phòng:
     * - Chủ cơ sở/Admin: Xem toàn bộ nhân viên buồng phòng và toàn cơ sở.
     * - Nhân viên buồng phòng: Tự động chỉ xem số liệu của chính mình.
     */
    @GetMapping("/productivity")
    public ResponseEntity<HousekeepingProductivityReportResponse> getProductivityReport(
            @RequestParam(required = false, defaultValue = "DAY") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            HttpServletRequest request
    ) {
        User actor = checkAuthorizedViewer(request);
        return ResponseEntity.ok(productivityService.getProductivityReport(period, date, startDate, endDate, actor));
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập");
        }
        return user;
    }

    private User checkOwnerOrAdmin(HttpServletRequest request) {
        User user = checkStaff(request);
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Chức năng chỉ dành cho Chủ cơ sở hoặc Quản trị viên");
        }
        return user;
    }

    private User checkAuthorizedViewer(HttpServletRequest request) {
        User user = checkStaff(request);
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN
                && user.getRole() != Role.HOUSEKEEPER && user.getRole() != Role.RECEPTIONIST) {
            throw new UnauthorizedException("Bạn không có quyền truy cập báo cáo năng suất");
        }
        return user;
    }
}
