package roomi.dev.service;

import roomi.dev.dto.request.BookingSurchargeUsageRequest;
import roomi.dev.dto.response.BookingSurchargeUsageResponse;
import roomi.dev.dto.response.InvoiceResponse;
import roomi.dev.model.User;

import java.util.List;

public interface BookingSurchargeUsageService {
    BookingSurchargeUsageResponse create(Long bookingId, BookingSurchargeUsageRequest request, User currentUser);
    BookingSurchargeUsageResponse update(Long bookingId, Long usageId, BookingSurchargeUsageRequest request, User currentUser);
    void delete(Long bookingId, Long usageId, User currentUser);
    List<BookingSurchargeUsageResponse> getByBookingId(Long bookingId, User currentUser);
    InvoiceResponse getInvoice(Long bookingId, User currentUser);
}
