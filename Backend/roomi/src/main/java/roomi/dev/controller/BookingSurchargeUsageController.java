package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.BookingSurchargeUsageRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.BookingSurchargeUsageResponse;
import roomi.dev.dto.response.InvoiceResponse;
import roomi.dev.model.User;
import roomi.dev.service.BookingSurchargeUsageService;
import roomi.dev.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bookings/{bookingId}")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BookingSurchargeUsageController {
    private final BookingSurchargeUsageService bookingSurchargeUsageService;
    private final AuthUtil authUtil;

    @GetMapping("/service-usages")
    public ResponseEntity<BaseResponse<List<BookingSurchargeUsageResponse>>> getUsages(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId) {
        User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.ok(BaseResponse.<List<BookingSurchargeUsageResponse>>builder()
                .mess("Thành công")
                .data(bookingSurchargeUsageService.getByBookingId(bookingId, currentUser))
                .build());
    }

    @PostMapping("/service-usages")
    public ResponseEntity<BaseResponse<BookingSurchargeUsageResponse>> createUsage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId,
            @Valid @RequestBody BookingSurchargeUsageRequest request) {
        User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.status(HttpStatus.CREATED).body(BaseResponse.<BookingSurchargeUsageResponse>builder()
                .mess("Ghi nhận sử dụng dịch vụ thành công")
                .data(bookingSurchargeUsageService.create(bookingId, request, currentUser))
                .build());
    }

    @PutMapping("/service-usages/{usageId}")
    public ResponseEntity<BaseResponse<BookingSurchargeUsageResponse>> updateUsage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId,
            @PathVariable Long usageId,
            @Valid @RequestBody BookingSurchargeUsageRequest request) {
        User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.ok(BaseResponse.<BookingSurchargeUsageResponse>builder()
                .mess("Cập nhật phát sinh dịch vụ thành công")
                .data(bookingSurchargeUsageService.update(bookingId, usageId, request, currentUser))
                .build());
    }

    @DeleteMapping("/service-usages/{usageId}")
    public ResponseEntity<BaseResponse<Void>> deleteUsage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long bookingId,
            @PathVariable Long usageId) {
        User currentUser = authUtil.getUserFromToken(token);
        bookingSurchargeUsageService.delete(bookingId, usageId, currentUser);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa phát sinh dịch vụ thành công")
                .build());
    }

    @GetMapping("/invoice")
        public ResponseEntity<BaseResponse<InvoiceResponse>> getInvoice(
                        @RequestHeader("Authorization") String token,
                        @PathVariable Long bookingId) {
                User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.ok(BaseResponse.<InvoiceResponse>builder()
                .mess("Thành công")
                                .data(bookingSurchargeUsageService.getInvoice(bookingId, currentUser))
                .build());
    }
}
