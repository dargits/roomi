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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import roomi.dev.dto.request.DateRangeRequest;
import roomi.dev.dto.response.OccupancyReportResponse;
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

       
        if (token == null || token.isBlank()) {
            throw new BusinessException("Thiếu token xác thực", ErrorCode.ACCESS_DENIED);
        }

        String cleanToken = token.startsWith("Bearer ") ? token.substring(7) : token;

        
        User currentUser = sessionService.getUserBySession(cleanToken)
                .orElseThrow(() -> new BusinessException("Session không hợp lệ hoặc đã hết hạn", ErrorCode.ACCESS_DENIED));

        boolean hasPermission = currentUser.getRole() == User.Role.ADMIN ||
                                currentUser.getRole() == User.Role.OWNER ||
                                currentUser.getRole() == User.Role.ACCOUNTANT;

        if (!hasPermission) {
            throw new BusinessException("Bạn không có quyền xem báo cáo doanh thu", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }

      
        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new BusinessException("Vui lòng cung cấp đầy đủ ngày bắt đầu và ngày kết thúc", ErrorCode.BAD_REQUEST);
        }
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new BusinessException("Ngày bắt đầu không được lớn hơn ngày kết thúc", ErrorCode.BAD_REQUEST);
        }

        
        RevenueReportResponse report = reportService.getRevenueReport(request.getStartDate(), request.getEndDate());

        return ResponseEntity.ok(BaseResponse.<RevenueReportResponse>builder()
                .mess("Lấy báo cáo doanh thu thành công")
                .data(report)
                .build());
    }

    @GetMapping("/revenue/excel")
    public ResponseEntity<byte[]> exportRevenueExcel(
            @RequestHeader(value = "Authorization", required = false) String token,
            RevenueRequest request) {

        
        if (token == null || token.isBlank()) {
            throw new BusinessException("Thiếu token xác thực", ErrorCode.ACCESS_DENIED);
        }
        String cleanToken = token.startsWith("Bearer ") ? token.substring(7) : token;
        User currentUser = sessionService.getUserBySession(cleanToken)
                .orElseThrow(() -> new BusinessException("Session không hợp lệ hoặc đã hết hạn", ErrorCode.ACCESS_DENIED));

        boolean hasPermission = currentUser.getRole() == User.Role.ADMIN ||
                                currentUser.getRole() == User.Role.OWNER ||
                                currentUser.getRole() == User.Role.ACCOUNTANT;
        if (!hasPermission) {
            throw new BusinessException("Bạn không có quyền xuất báo cáo", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }

       
        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new BusinessException("Vui lòng cung cấp đầy đủ ngày bắt đầu và ngày kết thúc", ErrorCode.BAD_REQUEST);
        }

       
        byte[] excelFile = reportService.exportRevenueReportExcel(request.getStartDate(), request.getEndDate());

        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "Bao_Cao_Doanh_Thu_" + request.getStartDate() + ".xlsx");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(excelFile);
    }

    @GetMapping("/occupancy")
    public ResponseEntity<BaseResponse<OccupancyReportResponse>> getOccupancyReport(
            @RequestHeader(value = "Authorization", required = false) String token,
            DateRangeRequest request) {

       
        if (token == null || token.isBlank()) {
            throw new BusinessException("Thiếu token xác thực", ErrorCode.ACCESS_DENIED);
        }
        String cleanToken = token.startsWith("Bearer ") ? token.substring(7) : token;

        
        User currentUser = sessionService.getUserBySession(cleanToken)
                .orElseThrow(() -> new BusinessException("Session không hợp lệ hoặc đã hết hạn", ErrorCode.ACCESS_DENIED));

        boolean hasPermission = currentUser.getRole() == User.Role.ADMIN || 
                                currentUser.getRole() == User.Role.OWNER;
        
        if (!hasPermission) {
            throw new BusinessException("Bạn không có quyền xem báo cáo công suất phòng", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }

      
        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new BusinessException("Vui lòng cung cấp đầy đủ ngày bắt đầu và ngày kết thúc", ErrorCode.BAD_REQUEST);
        }
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new BusinessException("Ngày bắt đầu không được lớn hơn ngày kết thúc", ErrorCode.BAD_REQUEST);
        }

     
        OccupancyReportResponse report = reportService.getOccupancyReport(request.getStartDate(), request.getEndDate());

        return ResponseEntity.ok(BaseResponse.<OccupancyReportResponse>builder()
                .mess("Lấy báo cáo công suất thành công")
                .data(report)
                .build());
    }
}