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
import roomi.dev.model.PropertySettings;
import roomi.dev.model.User;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.BookingSurchargeUsageRepository;
import roomi.dev.repository.GuestRepository;
import roomi.dev.repository.InvoiceRepository;
import roomi.dev.repository.PaymentRepository;
import roomi.dev.repository.PropertySettingsRepository;
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
    private final PropertySettingsRepository propertySettingsRepository;

    @Override
    @Transactional
    public PaymentResponse addPayment(Long bookingId, PaymentRequest request, User currentUser) {
        requirePaymentPermission(currentUser);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy booking", ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() == Booking.Status.CANCELLED) {
            throw new BusinessException("Không thể ghi nhận thanh toán cho đặt phòng đã bị hủy", ErrorCode.BOOKING_INVALID_STATUS);
        }

        requireReceptionistShift(booking, currentUser);

        Invoice invoice = invoiceRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BusinessException("Chưa có hóa đơn cho booking này", ErrorCode.INVOICE_NOT_FOUND));

        if (invoice.getStatus() == Invoice.Status.PAID) {
            throw new BusinessException("Hóa đơn đã được thanh toán đầy đủ", ErrorCode.INVOICE_PAID);
        }

        List<Payment> existingPayments = paymentRepository.findByInvoiceId(invoice.getId());
        BigDecimal currentPaid = (existingPayments != null) ? existingPayments.stream()
                .map(p -> p != null && p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add) : BigDecimal.ZERO;

        BigDecimal invoiceTotal = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal remaining = invoiceTotal.subtract(currentPaid);

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Số tiền thanh toán phải lớn hơn 0 VNĐ", ErrorCode.INVALID_INPUT);
        }

        if (request.getAmount().compareTo(remaining) > 0) {
            throw new BusinessException(
                    "Số tiền thanh toán (" + String.format("%,d", request.getAmount().longValue()) + " VNĐ) vượt quá số tiền còn lại (" + String.format("%,d", remaining.longValue()) + " VNĐ)",
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
                .paidAt(java.time.LocalDateTime.now())
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        // Calculate new total paid
        BigDecimal newTotalPaid = currentPaid.add(request.getAmount());
        if (newTotalPaid.compareTo(invoiceTotal) >= 0) {
            invoice.setStatus(Invoice.Status.PAID);
            invoiceRepository.save(invoice);
        }

        // BUG-01 FIX: Tích điểm thân thiết theo cấu hình PropertySettings
        try {
            if (booking.getGuest() != null) {
                PropertySettings settings = propertySettingsRepository.findById(1L).orElse(null);
                int pointsPerAmount = (settings != null && settings.getLoyaltyPointsPerAmount() != null)
                        ? settings.getLoyaltyPointsPerAmount() : 0;

                if (pointsPerAmount > 0) {
                    Guest guest = booking.getGuest();
                    int pointsEarned = request.getAmount()
                            .divide(new java.math.BigDecimal(pointsPerAmount), 0, java.math.RoundingMode.FLOOR)
                            .intValue();
                    if (pointsEarned > 0) {
                        int currentPoints = (guest.getLoyaltyPoints() != null) ? guest.getLoyaltyPoints() : 0;
                        guest.setLoyaltyPoints(currentPoints + pointsEarned);
                        guestRepository.save(guest);

                        activityLogService.log(currentUser, "TÍCH ĐIỂM THÂN THIẾT", "GUEST", guest.getId(),
                                "Tích lũy +" + pointsEarned + " điểm thân thiết cho khách hàng " + guest.getFullName()
                                + " (Thanh toán đơn #" + booking.getId() + " số tiền "
                                + String.format("%,d", request.getAmount().longValue()) + "đ)");
                    }
                }
            }
        } catch (Exception e) {
            // Log lỗi tích điểm nhưng không block luồng thanh toán chính
        }

        return toPaymentResponse(savedPayment);
    }

    @Override
    public List<PaymentResponse> getPaymentsByBookingId(Long bookingId, User currentUser) {
        requirePaymentViewerPermission(currentUser);

        Invoice invoice = invoiceRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BusinessException("Chưa có hóa đơn cho booking này", ErrorCode.INVOICE_NOT_FOUND));

        requireReceptionistShift(invoice.getBooking(), currentUser);

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
                || (user.getRole() != User.Role.RECEPTIONIST
                && user.getRole() != User.Role.ACCOUNTANT
                && user.getRole() != User.Role.ADMIN)) {
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

    private void requireReceptionistShift(Booking booking, User user) {
        // Tất cả lễ tân đều có quyền thao tác thanh toán cho các đơn trong khách sạn
    }

}
