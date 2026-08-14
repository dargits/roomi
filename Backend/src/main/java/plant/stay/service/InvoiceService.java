package plant.stay.service;

import plant.stay.dto.request.InvoiceAdjustRequest;
import plant.stay.dto.request.PaymentRequest;
import plant.stay.dto.response.InvoiceResponse;
import plant.stay.dto.response.PaymentResponse;
import plant.stay.model.User;

import java.util.List;

public interface InvoiceService {
    InvoiceResponse getByBooking(Long bookingId);
    InvoiceResponse getById(Long invoiceId);
    InvoiceResponse createInvoice(Long bookingId, User actor);
    InvoiceResponse adjustInvoice(Long invoiceId, InvoiceAdjustRequest request, User actor);
    PaymentResponse addPayment(Long invoiceId, PaymentRequest request, User actor);
    List<PaymentResponse> getPayments(Long invoiceId);
}
