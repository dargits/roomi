package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.DebtApprovalCreateRequest;
import plant.stay.dto.request.DebtApprovalRejectRequest;
import plant.stay.dto.request.DebtCollectionLogRequest;
import plant.stay.dto.response.DebtAgingReportResponse;
import plant.stay.dto.response.DebtCollectionLogResponse;
import plant.stay.dto.response.DebtItemResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.DebtApprovalService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/debt-approvals")
@RequiredArgsConstructor
public class DebtApprovalController {

    private final DebtApprovalService debtApprovalService;
    private final AuthUtil authUtil;

    // Lễ tân gửi yêu cầu trả phòng còn nợ
    @PostMapping("/request")
    public ResponseEntity<DebtItemResponse> requestDebtCheckout(
            @Valid @RequestBody DebtApprovalCreateRequest req,
            HttpServletRequest request) {
        User actor = checkReceptionist(request);
        return ResponseEntity.ok(debtApprovalService.requestDebtCheckout(req, actor));
    }

    // Chủ cơ sở phê duyệt trả phòng còn nợ (tuyệt đối chỉ OWNER/ADMIN)
    @PutMapping("/{id}/approve")
    public ResponseEntity<DebtItemResponse> approveDebtCheckout(
            @PathVariable Long id,
            HttpServletRequest request) {
        User actor = checkOwner(request);
        return ResponseEntity.ok(debtApprovalService.approveDebtCheckout(id, actor));
    }

    // Chủ cơ sở từ chối
    @PutMapping("/{id}/reject")
    public ResponseEntity<DebtItemResponse> rejectDebtCheckout(
            @PathVariable Long id,
            @Valid @RequestBody DebtApprovalRejectRequest req,
            HttpServletRequest request) {
        User actor = checkOwner(request);
        return ResponseEntity.ok(debtApprovalService.rejectDebtCheckout(id, req, actor));
    }

    // Danh sách công nợ chờ thu (sắp xếp theo ngày quá hạn giảm dần)
    @GetMapping("/debts")
    public ResponseEntity<List<DebtItemResponse>> getActiveDebts(HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(debtApprovalService.getActiveDebts());
    }

    // Danh sách yêu cầu chờ duyệt (cho Chủ cơ sở)
    @GetMapping("/pending")
    public ResponseEntity<List<DebtItemResponse>> getPendingRequests(HttpServletRequest request) {
        checkOwner(request);
        return ResponseEntity.ok(debtApprovalService.getPendingRequests());
    }

    // Tất cả yêu cầu
    @GetMapping("/all")
    public ResponseEntity<List<DebtItemResponse>> getAllRequests(HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(debtApprovalService.getAllRequests());
    }

    // Báo cáo tuổi nợ và nhắc thu
    @GetMapping("/aging")
    public ResponseEntity<DebtAgingReportResponse> getDebtAgingReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromCheckout,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toCheckout,
            @RequestParam(required = false) Long guestId,
            @RequestParam(required = false) String bucketFilter,
            @RequestParam(required = false) String reminderFilter,
            HttpServletRequest request) {
        checkFinancialStaff(request);
        return ResponseEntity.ok(debtApprovalService.getDebtAgingReport(
                asOfDate, fromCheckout, toCheckout, guestId, bucketFilter, reminderFilter));
    }

    // Xuất file CSV báo cáo tuổi nợ
    @GetMapping("/aging/export")
    public ResponseEntity<byte[]> exportDebtAgingCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromCheckout,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toCheckout,
            @RequestParam(required = false) Long guestId,
            @RequestParam(required = false) String bucketFilter,
            HttpServletRequest request) {
        checkFinancialStaff(request);
        byte[] csvData = debtApprovalService.exportDebtAgingCsv(
                asOfDate, fromCheckout, toCheckout, guestId, bucketFilter);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"debt-aging-report.csv\"");

        return new ResponseEntity<>(csvData, headers, HttpStatus.OK);
    }

    // Ghi nhận nhật ký một lần liên hệ đòi nợ
    @PostMapping("/{id}/collection-logs")
    public ResponseEntity<DebtCollectionLogResponse> addCollectionLog(
            @PathVariable Long id,
            @Valid @RequestBody DebtCollectionLogRequest req,
            HttpServletRequest request) {
        User actor = checkFinancialStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(debtApprovalService.addCollectionLog(id, req, actor));
    }

    // Xem lịch sử các lần liên hệ đòi nợ của một khoản công nợ
    @GetMapping("/{id}/collection-logs")
    public ResponseEntity<List<DebtCollectionLogResponse>> getCollectionLogs(
            @PathVariable Long id,
            HttpServletRequest request) {
        checkFinancialStaff(request);
        return ResponseEntity.ok(debtApprovalService.getCollectionLogs(id));
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Vui lòng đăng nhập");
        return user;
    }

    private User checkFinancialStaff(HttpServletRequest request) {
        User user = checkStaff(request);
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN 
                && user.getRole() != Role.ACCOUNTANT && user.getRole() != Role.RECEPTIONIST) {
            throw new BusinessException("Chỉ Kế toán, Lễ tân hoặc Quản trị viên mới có quyền truy cập chức năng này!", HttpStatus.FORBIDDEN);
        }
        return user;
    }

    private User checkOwner(HttpServletRequest request) {
        User user = checkStaff(request);
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN) {
            throw new BusinessException("Chỉ Chủ cơ sở mới có quyền phê duyệt công nợ!", HttpStatus.FORBIDDEN);
        }
        return user;
    }

    private User checkReceptionist(HttpServletRequest request) {
        User user = checkStaff(request);
        if (user.getRole() != Role.RECEPTIONIST) {
            throw new BusinessException("Chỉ Lễ tân mới có quyền đề nghị trả phòng còn nợ!", HttpStatus.FORBIDDEN);
        }
        return user;
    }
}
