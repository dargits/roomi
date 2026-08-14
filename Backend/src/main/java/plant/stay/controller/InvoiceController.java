package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.BookingServiceUsageRequest;
import plant.stay.dto.request.InvoiceAdjustRequest;
import plant.stay.dto.request.PaymentRequest;
import plant.stay.dto.response.*;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.BookingServiceUsageService;
import plant.stay.service.InvoiceService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@CrossOrigin("*")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final BookingServiceUsageService usageService;
    private final AuthUtil authUtil;

    // ===== Booking Service Usage =====

    @GetMapping("/api/v1/bookings/{bookingId}/services")
    public ResponseEntity<List<BookingServiceUsageResponse>> getServices(@PathVariable Long bookingId,
                                                                         HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(usageService.getByBooking(bookingId));
    }

    @PostMapping("/api/v1/bookings/{bookingId}/services")
    public ResponseEntity<BookingServiceUsageResponse> addService(
            @PathVariable Long bookingId,
            @Valid @RequestBody BookingServiceUsageRequest req,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(usageService.add(bookingId, req, actor));
    }

    @DeleteMapping("/api/v1/bookings/{bookingId}/services/{usageId}")
    public ResponseEntity<MessageResponse> removeService(@PathVariable Long bookingId,
                                                         @PathVariable Long usageId,
                                                         HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(usageService.remove(bookingId, usageId, actor));
    }

    // ===== Invoice =====

    @GetMapping("/api/v1/bookings/{bookingId}/invoice")
    public ResponseEntity<InvoiceResponse> getInvoiceByBooking(@PathVariable Long bookingId,
                                                               HttpServletRequest request) {
        checkFinance(request);
        return ResponseEntity.ok(invoiceService.getByBooking(bookingId));
    }

    @PostMapping("/api/v1/bookings/{bookingId}/invoice")
    public ResponseEntity<InvoiceResponse> createInvoice(@PathVariable Long bookingId,
                                                          HttpServletRequest request) {
        User actor = checkFinance(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.createInvoice(bookingId, actor));
    }

    @GetMapping("/api/v1/invoices/{invoiceId}")
    public ResponseEntity<InvoiceResponse> getById(@PathVariable Long invoiceId, HttpServletRequest request) {
        checkFinance(request);
        return ResponseEntity.ok(invoiceService.getById(invoiceId));
    }

    @PostMapping("/api/v1/invoices/{invoiceId}/adjust")
    public ResponseEntity<InvoiceResponse> adjustInvoice(@PathVariable Long invoiceId,
                                                          @Valid @RequestBody InvoiceAdjustRequest req,
                                                          HttpServletRequest request) {
        User actor = checkAccountant(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.adjustInvoice(invoiceId, req, actor));
    }

    // ===== Payment =====

    @GetMapping("/api/v1/invoices/{invoiceId}/payments")
    public ResponseEntity<List<PaymentResponse>> getPayments(@PathVariable Long invoiceId,
                                                             HttpServletRequest request) {
        checkFinance(request);
        return ResponseEntity.ok(invoiceService.getPayments(invoiceId));
    }

    @PostMapping("/api/v1/invoices/{invoiceId}/payments")
    public ResponseEntity<PaymentResponse> addPayment(@PathVariable Long invoiceId,
                                                       @Valid @RequestBody PaymentRequest req,
                                                       HttpServletRequest request) {
        User actor = checkFinance(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.addPayment(invoiceId, req, actor));
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.RECEPTIONIST))
            throw new UnauthorizedException("Không có quyền truy cập");
        return user;
    }

    private User checkFinance(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ACCOUNTANT
                && user.getRole() != Role.RECEPTIONIST))
            throw new UnauthorizedException("Không có quyền truy cập");
        return user;
    }

    private User checkAccountant(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ACCOUNTANT))
            throw new UnauthorizedException("Chỉ OWNER hoặc ACCOUNTANT mới có quyền điều chỉnh hóa đơn");
        return user;
    }
}
