package roomi.dev.service;

import roomi.dev.dto.request.PaymentRequest;
import roomi.dev.dto.response.InvoiceResponse;
import roomi.dev.dto.response.PaymentResponse;
import roomi.dev.model.User;

import java.util.List;

public interface PaymentService {
    PaymentResponse addPayment(Long bookingId, PaymentRequest request, User currentUser);
    List<PaymentResponse> getPaymentsByBookingId(Long bookingId, User currentUser);
    InvoiceResponse getInvoiceWithPayments(Long bookingId, User currentUser);
}
