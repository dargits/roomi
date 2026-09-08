package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.ApplyDiscountRequest;
import plant.stay.dto.request.RejectDiscountRequest;
import plant.stay.dto.response.DiscountResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.InvoiceDiscountService;
import plant.stay.util.AuthUtil;

/**
 * Controller xử lý các endpoint liên quan đến giảm giá hóa đơn.
 *
 * <p>Phân quyền:
 * <ul>
 *   <li>POST /discount, DELETE /discount: Lễ tân (RECEPTIONIST), Kế toán (ACCOUNTANT), Chủ cơ sở (OWNER)</li>
 *   <li>POST /discount/approve, POST /discount/reject: Chỉ OWNER</li>
 *   <li>GET /discount: Tất cả nhân viên (STAFF)</li>
 * </ul>
 */
@RestController
@CrossOrigin("*")
@RequiredArgsConstructor
@RequestMapping("/api/v1/invoices/{invoiceId}/discount")
public class InvoiceDiscountController {

    private final InvoiceDiscountService invoiceDiscountService;
    private final AuthUtil authUtil;

    /**
     * Lấy thông tin khoản giảm giá đang hiệu lực của hóa đơn.
     * GET /api/v1/invoices/{invoiceId}/discount
     */
    @GetMapping
    public ResponseEntity<DiscountResponse> getActiveDiscount(
            @PathVariable Long invoiceId,
            HttpServletRequest request) {
        checkStaff(request);
        DiscountResponse response = invoiceDiscountService.getActiveDiscount(invoiceId);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Lễ tân áp dụng khoản giảm giá cho hóa đơn.
     * POST /api/v1/invoices/{invoiceId}/discount
     *
     * <p>Hệ thống tự động xét duyệt dựa trên ngưỡng cấu hình:
     * <ul>
     *   <li>Nếu calculatedAmount < threshold → APPLIED (tự động duyệt)</li>
     *   <li>Nếu calculatedAmount >= threshold → PENDING_DISCOUNT_APPROVAL (khóa thanh toán)</li>
     * </ul>
     */
    @PostMapping
    public ResponseEntity<DiscountResponse> applyDiscount(
            @PathVariable Long invoiceId,
            @Valid @RequestBody ApplyDiscountRequest req,
            HttpServletRequest request) {
        // Lễ tân, Kế toán và Chủ cơ sở đều có thể áp dụng giảm giá
        User actor = checkStaff(request);
        DiscountResponse response = invoiceDiscountService.applyDiscount(invoiceId, req, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Xóa/Gỡ khoản giảm giá hiện tại khỏi hóa đơn.
     * DELETE /api/v1/invoices/{invoiceId}/discount
     *
     * <p>Chỉ được thực hiện khi hóa đơn chưa thanh toán (QTN-11).
     */
    @DeleteMapping
    public ResponseEntity<MessageResponse> removeDiscount(
            @PathVariable Long invoiceId,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        invoiceDiscountService.removeDiscount(invoiceId, actor);
        return ResponseEntity.ok(new MessageResponse("Đã xóa khoản giảm giá thành công."));
    }

    /**
     * Chủ cơ sở phê duyệt khoản giảm giá đang chờ duyệt.
     * POST /api/v1/invoices/{invoiceId}/discount/approve
     *
     * <p>Sau khi duyệt, tiền giảm được trừ ngay và hóa đơn trở về PENDING_PAYMENT.
     */
    @PostMapping("/approve")
    public ResponseEntity<DiscountResponse> approveDiscount(
            @PathVariable Long invoiceId,
            HttpServletRequest request) {
        // Chỉ OWNER mới có quyền phê duyệt giảm giá
        User actor = checkOwner(request);
        return ResponseEntity.ok(invoiceDiscountService.approveDiscount(invoiceId, actor));
    }

    /**
     * Chủ cơ sở từ chối khoản giảm giá đang chờ duyệt.
     * POST /api/v1/invoices/{invoiceId}/discount/reject
     *
     * <p>Sau khi từ chối, hóa đơn trở về PENDING_PAYMENT, không áp dụng giảm giá.
     */
    @PostMapping("/reject")
    public ResponseEntity<DiscountResponse> rejectDiscount(
            @PathVariable Long invoiceId,
            @Valid @RequestBody RejectDiscountRequest req,
            HttpServletRequest request) {
        // Chỉ OWNER mới có quyền từ chối giảm giá
        User actor = checkOwner(request);
        return ResponseEntity.ok(invoiceDiscountService.rejectDiscount(invoiceId, req, actor));
    }

    // =========================================================================
    // AUTH HELPERS
    // =========================================================================

    /**
     * Kiểm tra người dùng là nhân viên (OWNER, RECEPTIONIST, hoặc ACCOUNTANT).
     */
    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER
                && user.getRole() != Role.RECEPTIONIST
                && user.getRole() != Role.ACCOUNTANT)) {
            throw new UnauthorizedException("Không có quyền truy cập. Yêu cầu quyền nhân viên.");
        }
        return user;
    }

    /**
     * Kiểm tra người dùng là Chủ cơ sở (OWNER).
     * Chỉ OWNER mới có thể phê duyệt hoặc từ chối giảm giá.
     */
    private User checkOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || user.getRole() != Role.OWNER) {
            throw new UnauthorizedException(
                "Không có quyền truy cập. Chỉ Chủ cơ sở (OWNER) mới được phép phê duyệt/từ chối giảm giá."
            );
        }
        return user;
    }
}
