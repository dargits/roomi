package roomi.dev.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.DateRangeRequest;
import roomi.dev.dto.request.RevenueRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.OccupancyReportResponse;
import roomi.dev.dto.response.RevenueReportResponse;
import roomi.dev.model.User;
import roomi.dev.service.ReportService;
import roomi.dev.util.AuthUtil;

/**
 * Controller báo cáo thống kê — NCL-07 (§4 — Quản lý tài chính & báo cáo).
 *
 * Base URL: /api/v1/reports
 *
 * Các báo cáo hỗ trợ:
 *   1. Báo cáo doanh thu (Revenue Report)   — tổng hợp tiền theo khoảng ngày
 *   2. Xuất doanh thu ra Excel               — file .xlsx để gửi kế toán
 *   3. Báo cáo công suất phòng (Occupancy)  — tỷ lệ lấp đầy theo khoảng ngày
 *
 * Phân quyền (VT-01, VT-04, VT-05):
 *   - Báo cáo doanh thu + xuất Excel : OWNER, ACCOUNTANT, ADMIN
 *   - Báo cáo công suất phòng        : OWNER, ADMIN
 *     (ACCOUNTANT không xem công suất — chỉ quan tâm số tiền, không cần tỷ lệ phòng)
 *
 * Endpoints:
 *   GET /api/v1/reports/revenue        — báo cáo doanh thu (JSON)
 *   GET /api/v1/reports/revenue/excel  — xuất báo cáo doanh thu (file .xlsx)
 *   GET /api/v1/reports/occupancy      — báo cáo công suất phòng (JSON)
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReportController {

    private final ReportService reportService;
    private final AuthUtil      authUtil;

    // ------------------------------------------------------------------ REVENUE

    /**
     * Lấy báo cáo doanh thu theo khoảng ngày (NCL-07, §4.1).
     *
     * Doanh thu được tổng hợp từ các hóa đơn đã thanh toán (Invoice.Status = PAID)
     * trong khoảng [startDate, endDate].
     *
     * Quyền: OWNER, ACCOUNTANT, ADMIN
     *
     * Ví dụ: GET /api/v1/reports/revenue?startDate=2026-07-01&endDate=2026-07-31
     *
     * @param token      header Authorization
     * @param request    { startDate, endDate } — cả hai bắt buộc, startDate ≤ endDate
     */
    @GetMapping("/revenue")
    public ResponseEntity<BaseResponse<RevenueReportResponse>> getRevenueReport(
            @RequestHeader("Authorization") String token,
            RevenueRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.ACCOUNTANT);

        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new roomi.dev.exception.BusinessException(
                    "Vui lòng cung cấp đầy đủ ngày bắt đầu và ngày kết thúc",
                    roomi.dev.exception.ErrorCode.BAD_REQUEST);
        }
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new roomi.dev.exception.BusinessException(
                    "Ngày bắt đầu không được lớn hơn ngày kết thúc",
                    roomi.dev.exception.ErrorCode.BAD_REQUEST);
        }

        RevenueReportResponse report = reportService.getRevenueReport(
                request.getStartDate(), request.getEndDate());

        return ResponseEntity.ok(BaseResponse.<RevenueReportResponse>builder()
                .mess("Lấy báo cáo doanh thu thành công")
                .data(report)
                .build());
    }

    /**
     * Xuất báo cáo doanh thu ra file Excel (.xlsx) để tải về (NCL-07, §4.1 — xuất file).
     *
     * Response trả về binary stream với Content-Disposition: attachment.
     * Tên file mặc định: Bao_Cao_Doanh_Thu_{startDate}.xlsx
     *
     * Quyền: OWNER, ACCOUNTANT, ADMIN
     *
     * Ví dụ: GET /api/v1/reports/revenue/excel?startDate=2026-07-01&endDate=2026-07-31
     *
     * @param token      header Authorization
     * @param request    { startDate, endDate } — cả hai bắt buộc
     */
    @GetMapping("/revenue/excel")
    public ResponseEntity<byte[]> exportRevenueExcel(
            @RequestHeader("Authorization") String token,
            RevenueRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.ACCOUNTANT);

        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new roomi.dev.exception.BusinessException(
                    "Vui lòng cung cấp đầy đủ ngày bắt đầu và ngày kết thúc",
                    roomi.dev.exception.ErrorCode.BAD_REQUEST);
        }

        byte[] excelFile = reportService.exportRevenueReportExcel(
                request.getStartDate(), request.getEndDate());

        // Thiết lập header để trình duyệt tự động tải file xuống
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(
                MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData(
                "attachment",
                "Bao_Cao_Doanh_Thu_" + request.getStartDate() + ".xlsx");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(excelFile);
    }

    // ------------------------------------------------------------------ OCCUPANCY

    /**
     * Lấy báo cáo công suất phòng (tỷ lệ lấp đầy) theo khoảng ngày (NCL-07, §4.3).
     *
     * Công suất = số đêm phòng có khách / (tổng số phòng × số ngày trong kỳ) × 100%.
     * Dùng để đánh giá hiệu quả hoạt động của cơ sở lưu trú.
     *
     * Quyền: OWNER, ADMIN
     *   (ACCOUNTANT không xem — chỉ quan tâm doanh thu, không cần chỉ số vận hành)
     *
     * Ví dụ: GET /api/v1/reports/occupancy?startDate=2026-07-01&endDate=2026-07-31
     *
     * @param token      header Authorization
     * @param request    { startDate, endDate } — cả hai bắt buộc, startDate ≤ endDate
     */
    @GetMapping("/occupancy")
    public ResponseEntity<BaseResponse<OccupancyReportResponse>> getOccupancyReport(
            @RequestHeader("Authorization") String token,
            DateRangeRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER);

        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new roomi.dev.exception.BusinessException(
                    "Vui lòng cung cấp đầy đủ ngày bắt đầu và ngày kết thúc",
                    roomi.dev.exception.ErrorCode.BAD_REQUEST);
        }
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new roomi.dev.exception.BusinessException(
                    "Ngày bắt đầu không được lớn hơn ngày kết thúc",
                    roomi.dev.exception.ErrorCode.BAD_REQUEST);
        }

        OccupancyReportResponse report = reportService.getOccupancyReport(
                request.getStartDate(), request.getEndDate());

        return ResponseEntity.ok(BaseResponse.<OccupancyReportResponse>builder()
                .mess("Lấy báo cáo công suất thành công")
                .data(report)
                .build());
    }
}