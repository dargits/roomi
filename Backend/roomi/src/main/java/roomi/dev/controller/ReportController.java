package roomi.dev.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import roomi.dev.dto.request.RevenueRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.RevenueReportResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.User;
import roomi.dev.service.AuthService;
import roomi.dev.service.ReportService;
import roomi.dev.service.SessionService;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReportController {

    private final ReportService reportService;
    private final AuthService authService;
    private final SessionService sessionService;

    @GetMapping("/revenue")
    public ResponseEntity<BaseResponse<RevenueReportResponse>> getRevenueReport(
            @RequestHeader(value = "Authorization", required = false) String token,
            RevenueRequest request) { 

        // 1. Kiểm tra token có tồn tại không
        if (token == null || token.isBlank()) {
            throw new BusinessException("Thiếu token xác thực", ErrorCode.ACCESS_DENIED);
        }

        String cleanToken = token.startsWith("Bearer ") ? token.substring(7) : token;

        // 2. Lấy thông tin User từ Session đang hoạt động
        User currentUser = sessionService.getUserBySession(cleanToken)
                .orElseThrow(() -> new BusinessException("Session không hợp lệ hoặc đã hết hạn", ErrorCode.ACCESS_DENIED));

        // 3. Kiểm tra phân quyền: Chỉ cho phép ADMIN, OWNER hoặc ACCOUNTANT xem báo cáo
        // (Giả sử enum Role trong model của bạn có các giá trị: ADMIN, OWNER, ACCOUNTANT)
        boolean hasPermission = currentUser.getRole() == User.Role.ADMIN ||
                                currentUser.getRole() == User.Role.OWNER ||
                                currentUser.getRole() == User.Role.ACCOUNTANT;

        if (!hasPermission) {
            throw new BusinessException("Bạn không có quyền xem báo cáo doanh thu", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }

        // 4. Validate tính hợp lệ của ngày tháng đầu vào
        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new BusinessException("Vui lòng cung cấp đầy đủ ngày bắt đầu và ngày kết thúc", ErrorCode.BAD_REQUEST);
        }
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new BusinessException("Ngày bắt đầu không được lớn hơn ngày kết thúc", ErrorCode.BAD_REQUEST);
        }

        // 5. Gọi Service tính toán và trả về kết quả
        RevenueReportResponse report = reportService.getRevenueReport(request.getStartDate(), request.getEndDate());

        return ResponseEntity.ok(BaseResponse.<RevenueReportResponse>builder()
                .mess("Lấy báo cáo doanh thu thành công")
                .data(report)
                .build());
    }
}