package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.BookingRequestDto;
import plant.stay.dto.response.*;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.BookingService;
import plant.stay.service.BookingServiceUsageService;
import plant.stay.service.InvoiceService;
import plant.stay.service.impl.GuestServiceImpl;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin("*")
@RequiredArgsConstructor
public class BookingPortalController {

    private final BookingRequestRepository bookingRequestRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final BookingRepository bookingRepository;
    private final GuestRepository guestRepository;
    private final AuditLogService auditLogService;
    private final AuthUtil authUtil;
    private final GuestServiceImpl guestService;
    private final BookingService bookingService;
    private final BookingServiceUsageService usageService;
    private final InvoiceService invoiceService;
    private final DepositRepository depositRepository;
    private final plant.stay.service.PricingService pricingService;

    // === PUBLIC: Lấy thông tin đặt phòng chi tiết để chia sẻ ===
    @GetMapping("/api/v1/public/bookings/{id}")
    public ResponseEntity<BookingResponse> getPublicBooking(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.getById(id));
    }

    // === PUBLIC: Lấy dịch vụ phụ thu của đặt phòng ===
    @GetMapping("/api/v1/public/bookings/{id}/services")
    public ResponseEntity<List<BookingServiceUsageResponse>> getPublicBookingServices(@PathVariable Long id) {
        return ResponseEntity.ok(usageService.getByBooking(id));
    }

    // === PUBLIC: Lấy hóa đơn & các khoản thanh toán của đặt phòng ===
    @GetMapping("/api/v1/public/bookings/{id}/invoice")
    public ResponseEntity<?> getPublicBookingInvoice(@PathVariable Long id) {
        try {
            InvoiceResponse invoice = invoiceService.getByBooking(id);
            List<PaymentResponse> payments = (invoice != null && invoice.getId() != null)
                    ? invoiceService.getPayments(invoice.getId())
                    : List.of();
            return ResponseEntity.ok(java.util.Map.of(
                    "invoice", invoice != null ? invoice : java.util.Map.of(),
                    "payments", payments
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(java.util.Map.of(
                    "invoice", java.util.Map.of(),
                    "payments", List.of()
            ));
        }
    }

    // === PUBLIC: Lấy thông tin cọc của đặt phòng ===
    @GetMapping("/api/v1/public/bookings/{id}/deposits")
    public ResponseEntity<List<DepositResponse>> getPublicBookingDeposits(@PathVariable Long id) {
        List<DepositResponse> result = depositRepository.findByBookingIdOrderByCreatedAtDesc(id)
                .stream().map(d -> DepositResponse.builder()
                        .id(d.getId())
                        .bookingId(d.getBooking() != null ? d.getBooking().getId() : id)
                        .requiredAmount(d.getRequiredAmount())
                        .collectedAmount(d.getCollectedAmount())
                        .refundedAmount(d.getRefundedAmount())
                        .penaltyAmount(d.getPenaltyAmount())
                        .status(d.getStatus())
                        .paymentMethod(d.getPaymentMethod())
                        .shortPaidReason(d.getShortPaidReason())
                        .note(d.getNote())
                        .collectedByName(d.getCollectedBy() != null ? d.getCollectedBy().getName() : null)
                        .processedByName(d.getProcessedBy() != null ? d.getProcessedBy().getName() : null)
                        .collectedAt(d.getCollectedAt())
                        .processedAt(d.getProcessedAt())
                        .createdAt(d.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // === PUBLIC: Xem phòng trống ===
    @GetMapping("/api/v1/room-types/public/availability")
    public ResponseEntity<?> availability(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<RoomType> activeTypes = roomTypeRepository.findByActiveTrue();
        long nights = java.time.temporal.ChronoUnit.DAYS.between(from, to);
        if (nights <= 0) nights = 1;

        final long totalNights = nights;
        return ResponseEntity.ok(activeTypes.stream().map(rt -> {
            java.math.BigDecimal totalPrice = pricingService != null
                    ? pricingService.calculateTotalPrice(rt, from, to)
                    : (rt.getBasePrice() != null ? rt.getBasePrice().multiply(java.math.BigDecimal.valueOf(totalNights)) : java.math.BigDecimal.ZERO);
            java.math.BigDecimal pricePerNight = totalPrice.divide(java.math.BigDecimal.valueOf(totalNights), 0, java.math.RoundingMode.HALF_UP);
            boolean isSpecial = rt.getBasePrice() != null && pricePerNight.compareTo(rt.getBasePrice()) != 0;

            String priceSourceName = null;
            String priceSource = isSpecial ? "SPECIAL" : "BASE";
            if (pricingService != null) {
                List<plant.stay.dto.response.NightlyPriceDetailDto> nightDetails = new java.util.ArrayList<>();
                for (long i = 0; i < totalNights; i++) {
                    nightDetails.add(pricingService.calculateNightPrice(rt, from.plusDays(i)));
                }
                boolean hasHoliday = nightDetails.stream().anyMatch(d -> "HOLIDAY".equals(d.getPriceSource()));
                boolean hasWeekend = nightDetails.stream().anyMatch(d -> "WEEKEND".equals(d.getPriceSource()));
                boolean hasSeasonal = nightDetails.stream().anyMatch(d -> "SEASONAL".equals(d.getPriceSource()));

                if (hasHoliday) {
                    priceSource = "HOLIDAY";
                    priceSourceName = nightDetails.stream()
                            .filter(d -> "HOLIDAY".equals(d.getPriceSource()))
                            .map(plant.stay.dto.response.NightlyPriceDetailDto::getSourceName)
                            .filter(java.util.Objects::nonNull)
                            .findFirst().orElse("Giá ngày lễ");
                } else if (hasWeekend) {
                    priceSource = "WEEKEND";
                    priceSourceName = "Giá cuối tuần";
                } else if (hasSeasonal) {
                    priceSource = "SEASONAL";
                    priceSourceName = nightDetails.stream()
                            .filter(d -> "SEASONAL".equals(d.getPriceSource()))
                            .map(plant.stay.dto.response.NightlyPriceDetailDto::getSourceName)
                            .filter(java.util.Objects::nonNull)
                            .findFirst().orElse("Giá theo mùa");
                } else if (isSpecial) {
                    priceSourceName = "Giá ngày áp dụng";
                }
            }

            Map<String, Object> item = new java.util.HashMap<>();
            item.put("roomTypeId", rt.getId());
            item.put("name", rt.getName());
            item.put("basePrice", rt.getBasePrice() != null ? rt.getBasePrice() : java.math.BigDecimal.ZERO);
            item.put("currentPrice", pricePerNight);
            item.put("totalPrice", totalPrice);
            item.put("pricePerNight", pricePerNight);
            item.put("nights", totalNights);
            item.put("priceSource", priceSource);
            item.put("priceSourceName", priceSourceName);
            item.put("maxCapacity", rt.getMaxCapacity());
            item.put("amenitiesDescription", rt.getAmenitiesDescription() != null ? rt.getAmenitiesDescription() : "");
            item.put("imageUrls", rt.getImageUrls() != null ? rt.getImageUrls() : java.util.List.of());
            return item;
        }).collect(Collectors.toList()));
    }

    // === PUBLIC: Gửi yêu cầu đặt phòng ===
    @PostMapping("/api/v1/booking-requests")
    public ResponseEntity<BookingRequestResponse> submit(@Valid @RequestBody BookingRequestDto req) {
        RoomType roomType = roomTypeRepository.findById(req.getRoomTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
        if (!req.getCheckOutDate().isAfter(req.getCheckInDate())) {
            throw new IllegalArgumentException("Ngày trả phòng phải sau ngày nhận phòng");
        }

        BookingRequest bookingReq = BookingRequest.builder()
                .guestName(req.getGuestName()).phone(req.getPhone()).email(req.getEmail())
                .roomType(roomType)
                .checkInDate(req.getCheckInDate()).checkOutDate(req.getCheckOutDate())
                .note(req.getNote())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(bookingRequestRepository.save(bookingReq)));
    }

    // === STAFF: Xem danh sách yêu cầu ===
    @GetMapping("/api/v1/booking-requests")
    public ResponseEntity<List<BookingRequestResponse>> getAll(HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(bookingRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse).collect(Collectors.toList()));
    }

    // === STAFF: Duyệt yêu cầu ===
    @org.springframework.transaction.annotation.Transactional
    @PutMapping("/api/v1/booking-requests/{id}/approve")
    public ResponseEntity<BookingRequestResponse> approve(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkStaff(request);
        BookingRequest req = findById(id);
        if (req.getStatus() != BookingRequestStatus.PENDING)
            throw new IllegalArgumentException("Yêu cầu này không ở trạng thái chờ duyệt");

        // Tạo hoặc tìm khách
        Guest guest = guestRepository.findByPhone(req.getPhone()).orElse(null);
        if (guest == null) {
            guest = Guest.builder().name(req.getGuestName()).phone(req.getPhone()).email(req.getEmail()).build();
            guest = guestRepository.save(guest);
        } else {
            boolean updated = false;
            if (req.getEmail() != null && !req.getEmail().trim().isEmpty() && !req.getEmail().trim().equals(guest.getEmail())) {
                guest.setEmail(req.getEmail().trim());
                updated = true;
            }
            if (req.getGuestName() != null && !req.getGuestName().trim().isEmpty() && !req.getGuestName().equals(guest.getName())) {
                guest.setName(req.getGuestName().trim());
                updated = true;
            }
            if (updated) {
                guest = guestRepository.save(guest);
            }
        }

        // Tính giá dự kiến chính xác theo cấu hình giá linh hoạt (Holiday > Weekend > Season > Base)
        java.math.BigDecimal expectedPrice = pricingService != null
                ? pricingService.calculateTotalPrice(req.getRoomType(), req.getCheckInDate(), req.getCheckOutDate())
                : (req.getRoomType() != null && req.getRoomType().getBasePrice() != null
                    ? req.getRoomType().getBasePrice().multiply(java.math.BigDecimal.valueOf(Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(req.getCheckInDate(), req.getCheckOutDate()))))
                    : java.math.BigDecimal.ZERO);

        // Tạo booking từ request
        Booking booking = Booking.builder()
                .guest(guest).roomType(req.getRoomType())
                .checkInDate(req.getCheckInDate()).checkOutDate(req.getCheckOutDate())
                .status(BookingStatus.CONFIRMED).source("ONLINE")
                .expectedPrice(expectedPrice)
                .actualPrice(expectedPrice)
                .note(req.getNote()).createdBy(actor)
                .build();
        booking = bookingRepository.save(booking);

        req.setStatus(BookingRequestStatus.APPROVED);
        req.setConvertedBooking(booking);
        bookingRequestRepository.save(req);
        auditLogService.log("BookingRequest", req.getId(), "APPROVE", actor,
                "Duyệt yêu cầu → Booking #" + booking.getId());
        return ResponseEntity.ok(toResponse(req));
    }

    // === STAFF: Từ chối yêu cầu ===
    @org.springframework.transaction.annotation.Transactional
    @PutMapping("/api/v1/booking-requests/{id}/reject")
    public ResponseEntity<BookingRequestResponse> reject(@PathVariable Long id,
                                                         @RequestParam(required = false) String reason,
                                                         HttpServletRequest request) {
        User actor = checkStaff(request);
        BookingRequest req = findById(id);
        if (req.getStatus() != BookingRequestStatus.PENDING)
            throw new IllegalArgumentException("Yêu cầu này không ở trạng thái chờ duyệt");

        req.setStatus(BookingRequestStatus.REJECTED);
        req.setRejectReason(reason);
        bookingRequestRepository.save(req);
        auditLogService.log("BookingRequest", req.getId(), "REJECT", actor, "Từ chối: " + reason);
        return ResponseEntity.ok(toResponse(req));
    }

    private BookingRequest findById(Long id) {
        return bookingRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu đặt phòng"));
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.RECEPTIONIST && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Không có quyền truy cập");
        return user;
    }

    private BookingRequestResponse toResponse(BookingRequest r) {
        java.math.BigDecimal expectedPrice = null;
        if (pricingService != null && r.getRoomType() != null && r.getCheckInDate() != null && r.getCheckOutDate() != null) {
            try {
                expectedPrice = pricingService.calculateTotalPrice(r.getRoomType(), r.getCheckInDate(), r.getCheckOutDate());
            } catch (Exception ignored) {
            }
        }

        return BookingRequestResponse.builder()
                .id(r.getId()).guestName(r.getGuestName()).phone(r.getPhone()).email(r.getEmail())
                .roomTypeId(r.getRoomType() != null ? r.getRoomType().getId() : null)
                .roomTypeName(r.getRoomType() != null ? r.getRoomType().getName() : null)
                .checkInDate(r.getCheckInDate()).checkOutDate(r.getCheckOutDate())
                .note(r.getNote()).status(r.getStatus()).rejectReason(r.getRejectReason())
                .convertedBookingId(r.getConvertedBooking() != null ? r.getConvertedBooking().getId() : null)
                .expectedPrice(expectedPrice)
                .createdAt(r.getCreatedAt())
                .build();
    }
}
