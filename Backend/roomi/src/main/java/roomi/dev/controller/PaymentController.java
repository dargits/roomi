package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.PaymentRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.PaymentResponse;
import roomi.dev.model.User;
import roomi.dev.service.PaymentService;
import roomi.dev.util.AuthUtil;

import java.util.List;

/**
 * Controller quản lý thanh toán của đặt phòng (NCL-05 §2.4C).
 *
 * Base URL: /api/v1/bookings/{bookingId}/payments
 *
 * Endpoints:
 *   POST /api/v1/bookings/{bookingId}/payments — Ghi nhận 1 lần thanh toán (tiền mặt / chuyển khoản)
 *   GET  /api/v1/bookings/{bookingId}/payments — Lấy lịch sử các lần thanh toán của hóa đơn
 */
@RestController
@RequestMapping("/api/v1/bookings/{bookingId}/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentService paymentService;
    private final AuthUtil authUtil;

    /**
     * Ghi nhận một lần thanh toán cho hóa đơn của booking.
     * Hệ thống tự động chuyển Invoice status → PAID khi tổng tiền thanh toán đạt totalAmount.
     * Quyền: RECEPTIONIST, ACCOUNTANT, ADMIN
     */
    @PostMapping
    public ResponseEntity<BaseResponse<PaymentResponse>> addPayment(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId,
            @Valid @RequestBody PaymentRequest request) {

        User currentUser = authUtil.requireRoles(token, User.Role.RECEPTIONIST, User.Role.ACCOUNTANT, User.Role.ADMIN);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                BaseResponse.<PaymentResponse>builder()
                        .mess("Ghi nhận thanh toán thành công")
                        .data(paymentService.addPayment(bookingId, request, currentUser))
                        .build());
    }

    /**
     * Lấy danh sách tất cả các lần thanh toán đã thực hiện cho booking này.
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
     */
    @GetMapping
    public ResponseEntity<BaseResponse<List<PaymentResponse>>> getPayments(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId) {

        User currentUser = authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST, User.Role.ACCOUNTANT);

        return ResponseEntity.ok(BaseResponse.<List<PaymentResponse>>builder()
                .mess("Thành công")
                .data(paymentService.getPaymentsByBookingId(bookingId, currentUser))
                .build());
    }
}
