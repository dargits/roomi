package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.response.HousekeepingProductivityResponse;
import plant.stay.model.User;
import plant.stay.service.HousekeepingProductivityService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/housekeeping/reports")
@CrossOrigin("*")
@RequiredArgsConstructor
public class HousekeepingReportController {

    private final HousekeepingProductivityService productivityService;
    private final AuthUtil authUtil;

    /**
     * Báo cáo định mức thời gian dọn và theo dõi năng suất buồng phòng.
     * - Chủ cơ sở (OWNER/ADMIN): Xem toàn bộ số liệu theo loại phòng và theo từng nhân viên.
     * - Nhân viên buồng phòng (HOUSEKEEPER): Xem số liệu của chính mình.
     */
    @GetMapping("/productivity")
    public ResponseEntity<HousekeepingProductivityResponse> getProductivityReport(
            @RequestParam(required = false, defaultValue = "WEEK") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long housekeeperId,
            HttpServletRequest request
    ) {
        User currentUser = authUtil.getUserFromRequest(request);
        HousekeepingProductivityResponse response = productivityService.getProductivityReport(
                period, startDate, endDate, housekeeperId, currentUser
        );
        return ResponseEntity.ok(response);
    }
}
