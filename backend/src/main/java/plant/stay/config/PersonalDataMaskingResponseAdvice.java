package plant.stay.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;
import plant.stay.dto.response.BookingRequestResponse;
import plant.stay.dto.response.BookingResponse;
import plant.stay.dto.response.GroupBookingResponse;
import plant.stay.dto.response.GuestResponse;
import plant.stay.dto.response.GuestStatusDTO;
import plant.stay.dto.response.StayDeclarationResponseDTO;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.util.AuthUtil;
import plant.stay.util.PersonalDataMasker;

import java.util.Collection;

@RestControllerAdvice
public class PersonalDataMaskingResponseAdvice implements ResponseBodyAdvice<Object> {

    private final AuthUtil authUtil;
    private final HttpServletRequest request;

    public PersonalDataMaskingResponseAdvice(AuthUtil authUtil, HttpServletRequest request) {
        this.authUtil = authUtil;
        this.request = request;
    }

    @Override
    public boolean supports(MethodParameter returnType,
                            Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body,
                                  MethodParameter returnType,
                                  MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  org.springframework.http.server.ServerHttpRequest serverHttpRequest,
                                  org.springframework.http.server.ServerHttpResponse serverHttpResponse) {
        User actor = authUtil.getUserFromRequest(request);
        Role role = actor == null ? null : actor.getRole();
        if (!PersonalDataMasker.canViewFull(role)) {
            maskIdentifiers(body);
        }
        return body;
    }

    private void maskIdentifiers(Object body) {
        if (body instanceof GuestResponse guest) {
            guest.setPhone(PersonalDataMasker.maskPhone(guest.getPhone()));
            guest.setEmail(PersonalDataMasker.maskEmail(guest.getEmail()));
            guest.setIdNumber(PersonalDataMasker.maskIdentifier(guest.getIdNumber()));
        } else if (body instanceof BookingResponse booking) {
            booking.setGuestPhone(PersonalDataMasker.maskPhone(booking.getGuestPhone()));
            booking.setGuestEmail(PersonalDataMasker.maskEmail(booking.getGuestEmail()));
            booking.setGuestIdNumber(PersonalDataMasker.maskIdentifier(booking.getGuestIdNumber()));
        } else if (body instanceof GuestStatusDTO guestStatus) {
            guestStatus.setPhone(PersonalDataMasker.maskPhone(guestStatus.getPhone()));
            guestStatus.setIdNumber(PersonalDataMasker.maskIdentifier(guestStatus.getIdNumber()));
        } else if (body instanceof GroupBookingResponse groupBooking) {
            groupBooking.setRepresentativePhone(PersonalDataMasker.maskPhone(groupBooking.getRepresentativePhone()));
            groupBooking.setRepresentativeEmail(PersonalDataMasker.maskEmail(groupBooking.getRepresentativeEmail()));
            maskCollection(groupBooking.getBookings());
        } else if (body instanceof BookingRequestResponse bookingReq) {
            bookingReq.setPhone(PersonalDataMasker.maskPhone(bookingReq.getPhone()));
            bookingReq.setEmail(PersonalDataMasker.maskEmail(bookingReq.getEmail()));
        } else if (body instanceof StayDeclarationResponseDTO declaration) {
            maskCollection(declaration.getGuests());
        } else if (body instanceof Collection<?> collection) {
            maskCollection(collection);
        }
    }

    private void maskCollection(Collection<?> responses) {
        if (responses == null) {
            return;
        }
        responses.forEach(this::maskIdentifiers);
    }
}