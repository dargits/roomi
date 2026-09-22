package plant.stay.service;

import plant.stay.dto.request.NegotiatedPriceAgreementRequest;
import plant.stay.dto.response.NegotiatedPriceAgreementResponse;
import plant.stay.dto.response.NegotiatedPricePreviewResponse;
import plant.stay.model.NegotiatedPriceAgreement;
import plant.stay.model.User;

import java.time.LocalDate;
import java.util.List;

public interface NegotiatedPriceService {

    List<NegotiatedPriceAgreementResponse> getAll(Long corporateClientId, Long groupBookingId);

    NegotiatedPriceAgreementResponse getById(Long id);

    NegotiatedPriceAgreementResponse create(NegotiatedPriceAgreementRequest request, User actor);

    NegotiatedPriceAgreementResponse update(Long id, NegotiatedPriceAgreementRequest request, User actor);

    void delete(Long id, User actor);

    /**
     * Tìm thỏa thuận giá hợp lệ theo thứ tự ưu tiên:
     * 1. Hợp đồng gắn theo Đoàn (GroupBooking)
     * 2. Hợp đồng gắn theo Khách Công Ty (CorporateClient)
     */
    NegotiatedPriceAgreement resolveAgreement(Long groupBookingId, Long corporateClientId, LocalDate date);

    /**
     * Preview giá thỏa thuận trước khi lưu đặt phòng
     */
    NegotiatedPricePreviewResponse preview(Long corporateClientId, Long groupBookingId, Long roomTypeId, LocalDate checkIn, LocalDate checkOut, Integer guestCount, Integer childCount);
}
