package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.DebtApprovalCreateRequest;
import plant.stay.dto.request.DebtApprovalRejectRequest;
import plant.stay.dto.response.DebtItemResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.UnauthorizedException;
import org.springframework.http.HttpStatus;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.DebtApprovalService;
import plant.stay.util.AuthUtil;

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
        User actor = checkStaff(request);
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

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Vui lòng đăng nhập");
        return user;
    }

    private User checkOwner(HttpServletRequest request) {
        User user = checkStaff(request);
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN) {
            throw new BusinessException("Chỉ Chủ cơ sở mới có quyền phê duyệt công nợ!", HttpStatus.FORBIDDEN);
        }
        return user;
    }
}
