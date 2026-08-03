package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.BookingSurchargeUsageRequest;
import roomi.dev.dto.request.UpdateInvoiceRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.BookingSurchargeUsageResponse;
import roomi.dev.dto.response.InvoiceResponse;
import roomi.dev.model.User;
import roomi.dev.service.BookingSurchargeUsageService;
import roomi.dev.util.AuthUtil;

import java.util.List;

/**
 * Controller quản lý dịch vụ phụ thu và hóa đơn của một booking — NCL-05 (§2.3, §2.4).
 *
 * Base URL: /api/v1/bookings/{bookingId}
 *
 * Luồng nghiệp vụ (§2.3 — Quản lý dịch vụ phụ thu trong thời gian lưu trú):
 *   1. Khách yêu cầu dịch vụ (ăn sáng, giặt là, spa...)
 *   2. Lễ tân ghi nhận dịch vụ vào booking qua POST /service-usages
 *   3. Dịch vụ tự động cộng vào hóa đơn (GET /invoice)
 *   4. Khi trả phòng: lễ tân/kế toán xem GET /invoice để tổng hợp tiền trước khi thu
 *
 * Phân quyền:
 *   - Xem dịch vụ phụ thu   : OWNER, RECEPTIONIST, ADMIN
 *   - Thêm / Sửa / Xóa phụ thu: OWNER, RECEPTIONIST
 *   - Xem hóa đơn           : OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
 *     (ACCOUNTANT cần xem hóa đơn để đối soát — VT-04)
 *
 * Endpoints:
 *   GET    /api/v1/bookings/{bookingId}/service-usages              — danh sách phụ thu
 *   POST   /api/v1/bookings/{bookingId}/service-usages              — thêm phụ thu
 *   PUT    /api/v1/bookings/{bookingId}/service-usages/{usageId}    — sửa phụ thu
 *   DELETE /api/v1/bookings/{bookingId}/service-usages/{usageId}    — xóa phụ thu
 *   GET    /api/v1/bookings/{bookingId}/invoice                     — xem hóa đơn (tổng hợp)
 */
@RestController
@RequestMapping("/api/v1/bookings/{bookingId}")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BookingSurchargeUsageController {

    private final BookingSurchargeUsageService bookingSurchargeUsageService;
    private final AuthUtil                     authUtil;

    // ------------------------------------------------------------------ SERVICE USAGES

    /**
     * Lấy danh sách dịch vụ phụ thu đã ghi nhận cho booking này.
     * Dùng để kiểm tra trước khi lập hóa đơn.
     * Quyền: OWNER, RECEPTIONIST, ADMIN
     *
     * Ví dụ: GET /api/v1/bookings/42/service-usages
     */
    @GetMapping("/service-usages")
    public ResponseEntity<BaseResponse<List<BookingSurchargeUsageResponse>>> getUsages(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.ok(BaseResponse.<List<BookingSurchargeUsageResponse>>builder()
                .mess("Thành công")
                .data(bookingSurchargeUsageService.getByBookingId(bookingId, currentUser))
                .build());
    }

    /**
     * Ghi nhận một dịch vụ phụ thu mới cho booking (§2.3).
     * Điều kiện: booking phải ở trạng thái NEW, CONFIRMED hoặc CHECKED_IN.
     * Dịch vụ phụ thu tự động cộng vào hóa đơn.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: POST /api/v1/bookings/42/service-usages
     * Body: { "surchargeServiceId": 3, "quantity": 2, "note": "Ăn sáng ngày 2" }
     */
    @PostMapping("/service-usages")
    public ResponseEntity<BaseResponse<BookingSurchargeUsageResponse>> createUsage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId,
            @Valid @RequestBody BookingSurchargeUsageRequest request) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                BaseResponse.<BookingSurchargeUsageResponse>builder()
                        .mess("Ghi nhận sử dụng dịch vụ thành công")
                        .data(bookingSurchargeUsageService.create(bookingId, request, currentUser))
                        .build());
    }

    /**
     * Cập nhật một phát sinh dịch vụ phụ thu.
     * Điều kiện: booking đang CHECKED_IN hoặc CHECKED_OUT, hóa đơn chưa thanh toán.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: PUT /api/v1/bookings/42/service-usages/15
     */
    @PutMapping("/service-usages/{usageId}")
    public ResponseEntity<BaseResponse<BookingSurchargeUsageResponse>> updateUsage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId,
            @PathVariable Long usageId,
            @Valid @RequestBody BookingSurchargeUsageRequest request) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.ok(BaseResponse.<BookingSurchargeUsageResponse>builder()
                .mess("Cập nhật phát sinh dịch vụ thành công")
                .data(bookingSurchargeUsageService.update(bookingId, usageId, request, currentUser))
                .build());
    }

    /**
     * Xóa một phát sinh dịch vụ phụ thu.
     * Điều kiện: booking đang CHECKED_IN hoặc CHECKED_OUT, hóa đơn chưa thanh toán.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: DELETE /api/v1/bookings/42/service-usages/15
     */
    @DeleteMapping("/service-usages/{usageId}")
    public ResponseEntity<BaseResponse<Void>> deleteUsage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId,
            @PathVariable Long usageId) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST);

        bookingSurchargeUsageService.delete(bookingId, usageId, currentUser);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa phát sinh dịch vụ thành công")
                .build());
    }

    // ------------------------------------------------------------------ INVOICE

    /**
     * Lấy hóa đơn tổng hợp của booking (§2.4B — Lập hóa đơn).
     * Hóa đơn bao gồm:
     *   - roomCharge    = tiền phòng theo số đêm × giá theo mùa (hoặc basePrice)
     *   - serviceCharge = tổng dịch vụ phụ thu
     *   - discount      = giảm giá (nếu có)
     *   - totalAmount   = roomCharge + serviceCharge - discount
     *
     * Được gọi tự động tính lại mỗi lần xem → luôn phản ánh phụ thu mới nhất.
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
     *   (ACCOUNTANT cần xem để đối soát hóa đơn — VT-04)
     *
     * Ví dụ: GET /api/v1/bookings/42/invoice
     */
    @GetMapping("/invoice")
    public ResponseEntity<BaseResponse<InvoiceResponse>> getInvoice(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId) {

        // ACCOUNTANT được phép xem hóa đơn để đối soát (VT-04)
        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST,
                User.Role.ACCOUNTANT);

        return ResponseEntity.ok(BaseResponse.<InvoiceResponse>builder()
                .mess("Thành công")
                .data(bookingSurchargeUsageService.getInvoice(bookingId, currentUser))
                .build());
    }

    /**
     * Tạo hóa đơn điều chỉnh cho hóa đơn đã thanh toán (§3.4).
     * Tham chiếu hóa đơn gốc, nêu lý do điều chỉnh và số tiền điều chỉnh (+/-).
     * Quyền: OWNER, RECEPTIONIST, ADMIN
     */
    @PostMapping("/invoice/adjust")
    public ResponseEntity<BaseResponse<InvoiceResponse>> createAdjustmentInvoice(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId,
            @Valid @RequestBody roomi.dev.dto.request.InvoiceAdjustmentRequest request) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.ACCOUNTANT);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                BaseResponse.<InvoiceResponse>builder()
                        .mess("Tạo hóa đơn điều chỉnh thành công")
                        .data(bookingSurchargeUsageService.createAdjustmentInvoice(bookingId, request, currentUser))
                        .build());
    }

    /**
     * Cập nhật thông tin hóa đơn (sửa chiết khấu trực tiếp) cho hóa đơn chưa thanh toán.
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT
     */
    @PutMapping("/invoice")
    public ResponseEntity<BaseResponse<InvoiceResponse>> updateInvoice(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId,
            @Valid @RequestBody roomi.dev.dto.request.UpdateInvoiceRequest request) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST, User.Role.ACCOUNTANT);

        return ResponseEntity.ok(BaseResponse.<InvoiceResponse>builder()
                .mess("Cập nhật hóa đơn thành công")
                .data(bookingSurchargeUsageService.updateInvoice(bookingId, request, currentUser))
                .build());
    }
}
