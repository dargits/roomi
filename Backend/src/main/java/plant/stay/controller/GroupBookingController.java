package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.GroupBookingRequest;
import plant.stay.dto.request.GroupInvoiceCreateRequest;
import plant.stay.dto.request.GroupRoomAssignmentRequest;
import plant.stay.dto.request.PartialCancelRequest;
import plant.stay.dto.response.GroupBookingResponse;
import plant.stay.dto.response.GroupInvoiceResponse;
import plant.stay.dto.response.GroupRoomAssignmentSuggestionResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.GroupBookingService;
import plant.stay.service.InvoiceService;
import plant.stay.util.AuthUtil;

import java.util.List;


@RestController
@RequestMapping("/api/v1/group-bookings")
@CrossOrigin("*")
@RequiredArgsConstructor
public class GroupBookingController {

    private final GroupBookingService groupBookingService;
    private final InvoiceService invoiceService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<GroupBookingResponse>> getAll(HttpServletRequest request) {
        checkReadAccess(request);
        return ResponseEntity.ok(groupBookingService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupBookingResponse> getById(@PathVariable Long id, HttpServletRequest request) {
        checkReadAccess(request);
        return ResponseEntity.ok(groupBookingService.getById(id));
    }

    @PostMapping
    public ResponseEntity<GroupBookingResponse> create(@Valid @RequestBody GroupBookingRequest request,
                                                        HttpServletRequest httpRequest) {
        User actor = checkWriteAccess(httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(groupBookingService.create(request, actor));
    }

    @GetMapping("/{id}/assignment-suggestion")
    public ResponseEntity<GroupRoomAssignmentSuggestionResponse> getAssignmentSuggestion(@PathVariable Long id,
                                                                                           HttpServletRequest request) {
        checkReadAccess(request);
        return ResponseEntity.ok(groupBookingService.getAssignmentSuggestion(id));
    }

    @PutMapping("/{id}/assign-rooms")
    public ResponseEntity<GroupBookingResponse> assignRooms(@PathVariable Long id,
                                                             @Valid @RequestBody GroupRoomAssignmentRequest request,
                                                             HttpServletRequest httpRequest) {
        User actor = checkWriteAccess(httpRequest);
        return ResponseEntity.ok(groupBookingService.assignRooms(id, request, actor));
    }

    /**
     * NCL-13-CN-004: Hủy một phần số phòng trong hồ sơ đặt phòng đoàn.
     * Hủy từng phần không hủy cả đoàn — nếu chọn hủy hết thì service sẽ hướng dẫn.
     */
    @PostMapping("/{id}/cancel-partial")
    public ResponseEntity<GroupBookingResponse> cancelPartialRooms(
            @PathVariable Long id,
            @Valid @RequestBody PartialCancelRequest request,
            HttpServletRequest httpRequest) {
        User actor = checkWriteAccess(httpRequest);
        return ResponseEntity.ok(groupBookingService.cancelPartialRooms(id, request.getBookingIds(), actor));
    }

    /**
     * P1.4: Preview tính phí hủy một phần theo thời gian thực (không lưu vào CSDL).
     */
    @PostMapping("/{id}/cancel-partial/preview")
    public ResponseEntity<?> previewCancelPartial(
            @PathVariable Long id,
            @Valid @RequestBody PartialCancelRequest request,
            HttpServletRequest httpRequest) {
        checkReadAccess(httpRequest);
        return ResponseEntity.ok(groupBookingService.previewCancelPartial(id, request.getBookingIds()));
    }

    /**
     * P0: Ghi nhận thu tiền cọc cho hồ sơ đoàn.
     */
    @PostMapping("/{id}/deposits")
    public ResponseEntity<?> createDeposit(
            @PathVariable Long id,
            @Valid @RequestBody plant.stay.dto.request.GroupDepositCreateRequest request,
            HttpServletRequest httpRequest) {
        User actor = checkWriteAccess(httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(groupBookingService.createDeposit(id, request, actor));
    }

    /**
     * P0: Lấy danh sách các khoản cọc của đoàn.
     */
    @GetMapping("/{id}/deposits")
    public ResponseEntity<?> getDeposits(@PathVariable Long id, HttpServletRequest httpRequest) {
        checkReadAccess(httpRequest);
        return ResponseEntity.ok(groupBookingService.getDeposits(id));
    }


    @GetMapping("/{id}/invoices")
    public ResponseEntity<GroupInvoiceResponse> getInvoices(@PathVariable Long id, HttpServletRequest request) {
        checkFinanceReadAccess(request);
        return ResponseEntity.ok(invoiceService.getGroupInvoices(id));
    }

    @PostMapping("/{id}/invoices")
    public ResponseEntity<GroupInvoiceResponse> createInvoices(@PathVariable Long id,
                                                                @Valid @RequestBody GroupInvoiceCreateRequest request,
                                                                HttpServletRequest httpRequest) {
        User actor = checkFinanceWriteAccess(httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.createGroupInvoices(id, request, actor));
    }

    /**
     * Trả phòng hàng loạt cho đoàn: checkout tất cả phòng CHECKED_IN cùng lúc.
     * Dùng khi đoàn trả phòng đồng loạt. Yêu cầu hóa đơn đoàn đã thanh toán.
     */
    @PostMapping("/{id}/bulk-checkout")
    public ResponseEntity<?> bulkCheckOut(@PathVariable Long id, HttpServletRequest httpRequest) {
        User actor = checkWriteAccess(httpRequest);
        return ResponseEntity.ok(groupBookingService.bulkCheckOut(id, actor));
    }


    private User checkWriteAccess(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN
                && user.getRole() != Role.RECEPTIONIST)) {
            throw new UnauthorizedException("Không có quyền truy cập");
        }
        return user;
    }

    private void checkReadAccess(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN
                && user.getRole() != Role.RECEPTIONIST && user.getRole() != Role.ACCOUNTANT)) {
            throw new UnauthorizedException("Không có quyền truy cập");
        }
    }

    private void checkFinanceReadAccess(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN
                && user.getRole() != Role.RECEPTIONIST && user.getRole() != Role.ACCOUNTANT)) {
            throw new UnauthorizedException("Không có quyền truy cập");
        }
    }

    private User checkFinanceWriteAccess(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ACCOUNTANT
                && user.getRole() != Role.RECEPTIONIST && user.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Không có quyền lập hóa đơn đoàn");
        }
        return user;
    }
}