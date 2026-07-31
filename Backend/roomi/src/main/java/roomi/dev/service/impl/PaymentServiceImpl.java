package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.dto.request.PaymentRequest;
import roomi.dev.dto.response.InvoiceResponse;
import roomi.dev.dto.response.PaymentResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Booking;
import roomi.dev.model.Guest;
import roomi.dev.model.Invoice;
import roomi.dev.model.Payment;
import roomi.dev.model.User;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.BookingSurchargeUsageRepository;
import roomi.dev.repository.GuestRepository;
import roomi.dev.repository.InvoiceRepository;
import roomi.dev.repository.PaymentRepository;
import roomi.dev.service.ActivityLogService;
import roomi.dev.service.BookingSurchargeUsageService;
import roomi.dev.service.PaymentService;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final GuestRepository   guestRepository;
    private final BookingSurchargeUsageService bookingSurchargeUsageService;
    private final ActivityLogService activityLogService;

    @Override
    @Transactional
    public PaymentResponse addPayment(Long bookingId, PaymentRequest request, User currentUser) {
        requirePaymentPermission(currentUser);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy booking", ErrorCode.BOOKING_NOT_FOUND));

        Invoice invoice = invoiceRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BusinessException("Chưa có hóa đơn cho booking này", ErrorCode.INVOICE_NOT_FOUND));

        if (invoice.getStatus() == Invoice.Status.PAID) {
            throw new BusinessException("Hóa đơn đã được thanh toán đầy đủ", ErrorCode.INVOICE_PAID);
        }

        List<Payment> existingPayments = paymentRepository.findByInvoiceId(invoice.getId());
        BigDecimal currentPaid = existingPayments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remaining = invoice.getTotalAmount().subtract(currentPaid);

        if (request.getAmount().compareTo(remaining) > 0) {
            throw new BusinessException(
                    "Số tiền thanh toán (" + request.getAmount() + " VNĐ) vượt quá số tiền còn lại (" + remaining + " VNĐ)",
                    ErrorCode.PAYMENT_OVERPAID);
        }

        Payment.Method method;
        try {
            method = Payment.Method.valueOf(request.getMethod().trim().toUpperCase());
        } catch (Exception e) {
            throw new BusinessException("Phương thức thanh toán không hợp lệ (CASH, BANK_TRANSFER)", ErrorCode.INVALID_INPUT);
        }

        Payment payment = Payment.builder()
                .invoice(invoice)
                .amount(request.getAmount())
                .method(method)
                .receivedBy(currentUser)
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        // Calculate new total paid
        BigDecimal newTotalPaid = currentPaid.add(request.getAmount());
        if (newTotalPaid.compareTo(invoice.getTotalAmount()) >= 0) {
            invoice.setStatus(Invoice.Status.PAID);
            invoiceRepository.save(invoice);
        }

        // Tích điểm thân thiết cho khách hàng (Mỗi 10.000 VNĐ thanh toán = 1 điểm)
        if (booking.getGuest() != null) {
            Guest guest = booking.getGuest();
            int pointsEarned = request.getAmount().divide(new java.math.BigDecimal("10000"), 0, java.math.RoundingMode.FLOOR).intValue();
            if (pointsEarned > 0) {
                int currentPoints = (guest.getLoyaltyPoints() != null) ? guest.getLoyaltyPoints() : 0;
                guest.setLoyaltyPoints(currentPoints + pointsEarned);
                guestRepository.save(guest);

                activityLogService.log(currentUser, "TÍCH ĐIỂM THÂN THIẾT", "GUEST", guest.getId(),
                        "Tích lũy +" + pointsEarned + " điểm thân thiết cho khách hàng " + guest.getFullName() + 
                        " (Thanh toán đơn #" + booking.getId() + " số tiền " + String.format("%,d", request.getAmount().longValue()) + "đ)");
            }
        }

        return toPaymentResponse(savedPayment);
    }

    @Override
    public List<PaymentResponse> getPaymentsByBookingId(Long bookingId, User currentUser) {
        requirePaymentViewerPermission(currentUser);

        Invoice invoice = invoiceRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BusinessException("Chưa có hóa đơn cho booking này", ErrorCode.INVOICE_NOT_FOUND));

        return paymentRepository.findByInvoiceId(invoice.getId()).stream()
                .map(this::toPaymentResponse)
                .toList();
    }

    @Override
    public InvoiceResponse getInvoiceWithPayments(Long bookingId, User currentUser) {
        return bookingSurchargeUsageService.getInvoice(bookingId, currentUser);
    }

    private void requirePaymentPermission(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getActive())
                || (user.getRole() != User.Role.OWNER
                && user.getRole() != User.Role.ADMIN
                && user.getRole() != User.Role.RECEPTIONIST)) {
            throw new BusinessException("Bạn không có quyền ghi nhận thanh toán", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }
    }

    private void requirePaymentViewerPermission(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getActive())
                || (user.getRole() != User.Role.OWNER
                && user.getRole() != User.Role.ADMIN
                && user.getRole() != User.Role.RECEPTIONIST
                && user.getRole() != User.Role.ACCOUNTANT)) {
            throw new BusinessException("Bạn không có quyền xem thông tin thanh toán", ErrorCode.INSUFFICIENT_PRIVILEGES);
        }
    }

    private PaymentResponse toPaymentResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .invoiceId(payment.getInvoice().getId())
                .amount(payment.getAmount())
                .method(payment.getMethod().name())
                .receivedById(payment.getReceivedBy() != null ? payment.getReceivedBy().getId() : null)
                .receivedByName(payment.getReceivedBy() != null ? payment.getReceivedBy().getFullName() : null)
                .paidAt(payment.getPaidAt())
                .build();
    }
}
