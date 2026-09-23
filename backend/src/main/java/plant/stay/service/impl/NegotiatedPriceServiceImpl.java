package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.NegotiatedPriceAgreementRequest;
import plant.stay.dto.response.NegotiatedPriceAgreementResponse;
import plant.stay.dto.response.NegotiatedPricePreviewResponse;
import plant.stay.dto.response.NightlyPriceBreakdownResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.CorporateClient;
import plant.stay.model.GroupBooking;
import plant.stay.model.NegotiatedPriceAgreement;
import plant.stay.model.User;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.CorporateClientRepository;
import plant.stay.repository.GroupBookingRepository;
import plant.stay.repository.NegotiatedPriceAgreementRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.NegotiatedPriceService;
import plant.stay.service.PricingService;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class NegotiatedPriceServiceImpl implements NegotiatedPriceService {

    private final NegotiatedPriceAgreementRepository agreementRepository;
    private final CorporateClientRepository corporateClientRepository;
    private final GroupBookingRepository groupBookingRepository;
    private final BookingRepository bookingRepository;
    private final PricingService pricingService;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public List<NegotiatedPriceAgreementResponse> getAll(Long corporateClientId, Long groupBookingId) {
        List<NegotiatedPriceAgreement> agreements;
        if (corporateClientId != null) {
            agreements = agreementRepository.findByCorporateClientIdOrderByIdDesc(corporateClientId);
        } else if (groupBookingId != null) {
            agreements = agreementRepository.findByGroupBookingIdOrderByIdDesc(groupBookingId);
        } else {
            agreements = agreementRepository.findAllByOrderByIdDesc();
        }
        return agreements.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public NegotiatedPriceAgreementResponse getById(Long id) {
        NegotiatedPriceAgreement agreement = agreementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thỏa thuận giá có ID: " + id));
        return toResponse(agreement);
    }

    @Override
    public NegotiatedPriceAgreementResponse create(NegotiatedPriceAgreementRequest request, User actor) {
        if (request.getCorporateClientId() == null && request.getGroupBookingId() == null) {
            throw new IllegalArgumentException("Thỏa thuận giá phải gắn với Khách hàng công ty hoặc Đoàn đặt phòng");
        }
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new IllegalArgumentException("Ngày bắt đầu không được sau ngày kết thúc");
        }

        CorporateClient corporateClient = null;
        if (request.getCorporateClientId() != null) {
            corporateClient = corporateClientRepository.findById(request.getCorporateClientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng công ty ID: " + request.getCorporateClientId()));
        }

        GroupBooking groupBooking = null;
        if (request.getGroupBookingId() != null) {
            groupBooking = groupBookingRepository.findById(request.getGroupBookingId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đoàn đặt phòng ID: " + request.getGroupBookingId()));
        }

        NegotiatedPriceAgreement agreement = NegotiatedPriceAgreement.builder()
                .name(request.getName())
                .corporateClient(corporateClient)
                .groupBooking(groupBooking)
                .pricePerNight(request.getPricePerNight())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .active(request.getActive() != null ? request.getActive() : true)
                .note(request.getNote())
                .createdBy(actor)
                .build();

        NegotiatedPriceAgreement saved = agreementRepository.save(agreement);
        syncGroupBookings(saved);
        auditLogService.log("NegotiatedPriceAgreement", saved.getId(), "CREATE", actor,
                "Tạo mới thỏa thuận giá: " + saved.getName() + " - Mức giá: " + saved.getPricePerNight() + " đ/đêm");

        return toResponse(saved);
    }

    @Override
    public NegotiatedPriceAgreementResponse update(Long id, NegotiatedPriceAgreementRequest request, User actor) {
        NegotiatedPriceAgreement agreement = agreementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thỏa thuận giá có ID: " + id));

        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new IllegalArgumentException("Ngày bắt đầu không được sau ngày kết thúc");
        }

        agreement.setName(request.getName());
        agreement.setPricePerNight(request.getPricePerNight());
        agreement.setStartDate(request.getStartDate());
        agreement.setEndDate(request.getEndDate());
        if (request.getActive() != null) {
            agreement.setActive(request.getActive());
        }
        agreement.setNote(request.getNote());

        if (request.getCorporateClientId() != null) {
            CorporateClient corporateClient = corporateClientRepository.findById(request.getCorporateClientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng công ty ID: " + request.getCorporateClientId()));
            agreement.setCorporateClient(corporateClient);
        }

        if (request.getGroupBookingId() != null) {
            GroupBooking groupBooking = groupBookingRepository.findById(request.getGroupBookingId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đoàn đặt phòng ID: " + request.getGroupBookingId()));
            agreement.setGroupBooking(groupBooking);
        }

        NegotiatedPriceAgreement saved = agreementRepository.save(agreement);
        syncGroupBookings(saved);
        auditLogService.log("NegotiatedPriceAgreement", saved.getId(), "UPDATE", actor,
                "Cập nhật thỏa thuận giá: " + saved.getName());

        return toResponse(saved);
    }

    private void syncGroupBookings(NegotiatedPriceAgreement agreement) {
        if (agreement.getGroupBooking() != null && Boolean.TRUE.equals(agreement.getActive())) {
            List<plant.stay.model.Booking> bookings = bookingRepository.findByGroupBookingId(agreement.getGroupBooking().getId());
            for (plant.stay.model.Booking b : bookings) {
                if (b.getStatus() == plant.stay.model.BookingStatus.NEW) {
                    long nights = java.time.temporal.ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate());
                    if (nights <= 0) nights = 1;
                    java.math.BigDecimal newPrice = agreement.getPricePerNight().multiply(java.math.BigDecimal.valueOf(nights));
                    b.setExpectedPrice(newPrice);
                    b.setActualPrice(newPrice);
                    b.setAppliedAgreement(agreement);
                    b.setPriceSource("NEGOTIATED");
                    bookingRepository.save(b);
                }
            }
        }
    }

    @Override
    public void delete(Long id, User actor) {
        NegotiatedPriceAgreement agreement = agreementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thỏa thuận giá có ID: " + id));

        agreement.setActive(false);
        agreementRepository.save(agreement);
        auditLogService.log("NegotiatedPriceAgreement", agreement.getId(), "DEACTIVATE", actor,
                "Vô hiệu hóa thỏa thuận giá: " + agreement.getName());
    }

    @Override
    @Transactional(readOnly = true)
    public NegotiatedPriceAgreement resolveAgreement(Long groupBookingId, Long corporateClientId, LocalDate date) {
        // 1. Ưu tiên thỏa thuận đoàn trước
        if (groupBookingId != null) {
            List<NegotiatedPriceAgreement> groupAgreements = agreementRepository.findActiveByGroupBookingIdAndDate(groupBookingId, date);
            if (!groupAgreements.isEmpty()) {
                return groupAgreements.get(0);
            }
        }

        // 2. Ưu tiên thỏa thuận khách công ty
        if (corporateClientId != null) {
            List<NegotiatedPriceAgreement> corpAgreements = agreementRepository.findActiveByCorporateClientIdAndDate(corporateClientId, date);
            if (!corpAgreements.isEmpty()) {
                return corpAgreements.get(0);
            }
        }

        return null;
    }

    @Override
    @Transactional(readOnly = true)
    public NegotiatedPricePreviewResponse preview(Long corporateClientId, Long groupBookingId, Long roomTypeId,
                                                   LocalDate checkIn, LocalDate checkOut, Integer guestCount, Integer childCount) {
        if (checkIn == null || checkOut == null) {
            throw new IllegalArgumentException("Ngày nhận phòng và trả phòng không được để trống");
        }
        if (checkIn.isAfter(checkOut) || checkIn.isEqual(checkOut)) {
            throw new IllegalArgumentException("Ngày nhận phòng phải trước ngày trả phòng");
        }

        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights <= 0) nights = 1;

        NightlyPriceBreakdownResponse standardBreakdown = pricingService.calculateBreakdown(roomTypeId, checkIn, checkOut, guestCount, childCount, null);

        NegotiatedPriceAgreement agreement = resolveAgreement(groupBookingId, corporateClientId, checkIn);
        if (agreement == null) {
            return NegotiatedPricePreviewResponse.builder()
                    .applied(false)
                    .agreementType("NONE")
                    .standardPrice(standardBreakdown.getGrandTotal())
                    .totalPrice(standardBreakdown.getGrandTotal())
                    .totalNights((int) nights)
                    .build();
        }

        NightlyPriceBreakdownResponse negotiatedBreakdown = pricingService.calculateBreakdown(roomTypeId, checkIn, checkOut, guestCount, childCount, agreement);

        String agreementType = agreement.getGroupBooking() != null ? "GROUP" : "CORPORATE";
        String clientOrGroupName = agreement.getGroupBooking() != null
                ? (agreement.getGroupBooking().getRepresentativeGuest() != null ? "Đoàn: " + agreement.getGroupBooking().getRepresentativeGuest().getName() : "Đoàn #" + agreement.getGroupBooking().getId())
                : (agreement.getCorporateClient() != null ? agreement.getCorporateClient().getCompanyName() : "");

        return NegotiatedPricePreviewResponse.builder()
                .applied(true)
                .agreementId(agreement.getId())
                .agreementName(agreement.getName())
                .agreementType(agreementType)
                .clientOrGroupName(clientOrGroupName)
                .pricePerNight(agreement.getPricePerNight())
                .totalNights((int) nights)
                .totalPrice(negotiatedBreakdown.getGrandTotal())
                .standardPrice(standardBreakdown.getGrandTotal())
                .build();
    }

    private NegotiatedPriceAgreementResponse toResponse(NegotiatedPriceAgreement a) {
        return NegotiatedPriceAgreementResponse.builder()
                .id(a.getId())
                .name(a.getName())
                .corporateClientId(a.getCorporateClient() != null ? a.getCorporateClient().getId() : null)
                .corporateClientName(a.getCorporateClient() != null ? a.getCorporateClient().getCompanyName() : null)
                .groupBookingId(a.getGroupBooking() != null ? a.getGroupBooking().getId() : null)
                .groupBookingRepName(a.getGroupBooking() != null && a.getGroupBooking().getRepresentativeGuest() != null ? a.getGroupBooking().getRepresentativeGuest().getName() : null)
                .pricePerNight(a.getPricePerNight())
                .startDate(a.getStartDate())
                .endDate(a.getEndDate())
                .active(a.getActive())
                .note(a.getNote())
                .createdById(a.getCreatedBy() != null ? a.getCreatedBy().getId() : null)
                .createdByName(a.getCreatedBy() != null ? a.getCreatedBy().getName() : null)
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
