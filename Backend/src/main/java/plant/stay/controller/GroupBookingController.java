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
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ACCOUNTANT)) {
            throw new UnauthorizedException("Chỉ OWNER hoặc ACCOUNTANT mới có quyền lập hóa đơn đoàn");
        }
        return user;
    }
}