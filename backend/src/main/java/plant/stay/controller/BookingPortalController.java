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
import lombok.extern.slf4j.Slf4j;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin("*")
@Slf4j
@RequiredArgsConstructor
public class BookingPortalController {

    private final BookingRequestRepository bookingRequestRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
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
    private final InvoiceRepository invoiceRepository;
    private final HotelSettingRepository hotelSettingRepository;
    private final PublicGroupBookingRequestRepository publicGroupBookingRequestRepository;

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

    // === PUBLIC (NCL-09-CN-008): Lấy hóa đơn & các khoản thanh toán của đặt phòng ===
    @GetMapping("/api/v1/public/bookings/{id}/invoice")
    public ResponseEntity<?> getPublicBookingInvoice(
            @PathVariable Long id,
            @RequestParam(required = false) String phone) {
        HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
        if (setting != null && Boolean.FALSE.equals(setting.getPublicInvoiceLookupEnabled())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "Chức năng tra cứu hóa đơn trực tuyến hiện đang tạm tắt theo chính sách của cơ sở lưu trú.",
                    "disabled", true
            ));
        }

        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "message", "Không tìm thấy thông tin đặt phòng #" + id
            ));
        }

        if (phone != null && !phone.trim().isEmpty()) {
            String guestPhone = booking.getGuest() != null ? booking.getGuest().getPhone() : "";
            if (!isPhoneMatch(guestPhone, phone.trim())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "message", "Số điện thoại không khớp với thông tin đăng ký của đặt phòng này."
                ));
            }
        }

        // Lấy tất cả hóa đơn liên quan đến booking này
        List<Invoice> allInvoices = invoiceRepository.findInvoicesCoveringBooking(id);

        // NCL-09-CN-008-TC-02: Lọc bỏ hoàn toàn hóa đơn nháp (DRAFT) và đã hủy (CANCELLED)
        List<Invoice> eligibleInvoices = allInvoices.stream()
                .filter(inv -> inv.getStatus() != InvoiceStatus.DRAFT && inv.getStatus() != InvoiceStatus.CANCELLED)
                .collect(Collectors.toList());

        if (eligibleInvoices.isEmpty()) {
            Map<String, Object> emptyResp = new java.util.HashMap<>();
            emptyResp.put("invoice", null);
            emptyResp.put("invoices", List.of());
            emptyResp.put("payments", List.of());
            emptyResp.put("message", "Chưa có hóa đơn chính thức cho đợt lưu trú này.");
            return ResponseEntity.ok(emptyResp);
        }

        // Hóa đơn chính (ưu tiên hóa đơn mới nhất)
        Invoice primary = eligibleInvoices.get(0);
        InvoiceResponse primaryResp = toInvoiceResponse(primary);

        List<InvoiceResponse> invoiceResponses = eligibleInvoices.stream()
                .map(this::toInvoiceResponse)
                .collect(Collectors.toList());

        // Hóa đơn gốc (nếu primary là hóa đơn điều chỉnh) hoặc hóa đơn điều chỉnh (nếu có)
        InvoiceResponse originalInvoice = null;
        InvoiceResponse adjustmentInvoice = null;
        if (primary.getAdjustmentOf() != null) {
            originalInvoice = toInvoiceResponse(primary.getAdjustmentOf());
            adjustmentInvoice = primaryResp;
        } else if (eligibleInvoices.size() > 1) {
            for (Invoice inv : eligibleInvoices) {
                if (inv.getAdjustmentOf() != null && inv.getAdjustmentOf().getId().equals(primary.getId())) {
                    adjustmentInvoice = toInvoiceResponse(inv);
                    originalInvoice = primaryResp;
                    break;
                }
            }
        }

        List<PaymentResponse> payments = (primary.getId() != null)
                ? invoiceService.getPayments(primary.getId())
                : List.of();

        // NCL-09-CN-008-TC-04: Ghi nhật ký truy cập dữ liệu cá nhân
        try {
            auditLogService.log("Invoice", primary.getId(), "VIEW_PUBLIC_INVOICE", null,
                    "Khách truy cập công khai xem hóa đơn #" + primary.getId() + " của đặt phòng #" + id);
        } catch (Exception e) {
            log.warn("Không thể ghi audit log xem hóa đơn công khai: {}", e.getMessage());
        }

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("invoice", primaryResp);
        result.put("invoices", invoiceResponses);
        result.put("originalInvoice", originalInvoice);
        result.put("adjustmentInvoice", adjustmentInvoice);
        result.put("payments", payments);
        result.put("bookingId", id);
        return ResponseEntity.ok(result);
    }

    // === PUBLIC (NCL-09-CN-008): Tra cứu hóa đơn bằng mã đặt phòng và số điện thoại ===
    @GetMapping("/api/v1/public/invoices/lookup")
    public ResponseEntity<?> lookupInvoice(
            @RequestParam String bookingCode,
            @RequestParam String phone) {
        if (bookingCode == null || bookingCode.trim().isEmpty() || phone == null || phone.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập đầy đủ mã đặt phòng và số điện thoại."));
        }

        String numStr = bookingCode.trim().replaceAll("[^0-9]", "");
        if (numStr.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mã đặt phòng không hợp lệ. Vui lòng nhập số mã đặt phòng."));
        }
        try {
            Long bookingId = Long.parseLong(numStr);
            return getPublicBookingInvoice(bookingId, phone);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mã đặt phòng không hợp lệ."));
        }
    }

    // === PUBLIC (NCL-09-CN-008-TC-04): Ghi nhật ký in/tải hóa đơn công khai ===
    @PostMapping("/api/v1/public/invoices/{invoiceId}/log-access")
    public ResponseEntity<?> logPublicInvoiceAccess(
            @PathVariable Long invoiceId,
            @RequestParam(defaultValue = "PRINT") String actionType) {
        Invoice inv = invoiceRepository.findById(invoiceId).orElse(null);
        if (inv == null || inv.getStatus() == InvoiceStatus.DRAFT || inv.getStatus() == InvoiceStatus.CANCELLED) {
            return ResponseEntity.badRequest().body(Map.of("message", "Hóa đơn không tồn tại hoặc không hợp lệ."));
        }
        String act = "EXPORT".equalsIgnoreCase(actionType) ? "EXPORT_PUBLIC_INVOICE" : "PRINT_PUBLIC_INVOICE";
        String desc = "Khách thực hiện " + ("EXPORT".equalsIgnoreCase(actionType) ? "kết xuất/tải về" : "in") + " hóa đơn #" + invoiceId;
        auditLogService.log("Invoice", invoiceId, act, null, desc);
        return ResponseEntity.ok(Map.of("message", "Đã ghi nhận nhật ký truy cập hóa đơn."));
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

            boolean hasDifferentPrices = false;
            java.math.BigDecimal firstNightPrice = null;
            String singleSourceName = null;
            if (pricingService != null) {
                for (long i = 0; i < totalNights; i++) {
                    var nd = pricingService.calculateNightPrice(rt, from.plusDays(i));
                    java.math.BigDecimal p = nd.getAppliedPrice();
                    if (firstNightPrice == null) {
                        firstNightPrice = p;
                        singleSourceName = nd.getSourceName();
                    } else if (firstNightPrice.compareTo(p) != 0) {
                        hasDifferentPrices = true;
                    }
                }
            }

            String priceSourceName = null;
            if (hasDifferentPrices) {
                priceSourceName = "Giá TB (" + totalNights + " đêm)";
            } else if (isSpecial) {
                priceSourceName = singleSourceName != null ? singleSourceName : "Giá ngày áp dụng";
            }

            // Tính số phòng khả dụng thực tế
            long availableRooms = calculateAvailableRoomsForRange(rt.getId(), from, to);
            long totalPhysicalRooms = roomRepository.countByRoomTypeId(rt.getId());
            boolean isAvailable = totalPhysicalRooms > 0 && availableRooms > 0;

            Map<String, Object> item = new java.util.HashMap<>();
            item.put("roomTypeId", rt.getId());
            item.put("name", rt.getName());
            item.put("basePrice", rt.getBasePrice() != null ? rt.getBasePrice() : java.math.BigDecimal.ZERO);
            item.put("currentPrice", pricePerNight);
            item.put("totalPrice", totalPrice);
            item.put("pricePerNight", pricePerNight);
            item.put("nights", totalNights);
            item.put("priceSource", isSpecial ? "SPECIAL" : "BASE");
            item.put("priceSourceName", priceSourceName);
            item.put("isAveragePrice", hasDifferentPrices);
            item.put("maxCapacity", rt.getMaxCapacity());
            item.put("amenitiesDescription", rt.getAmenitiesDescription() != null ? rt.getAmenitiesDescription() : "");
            item.put("imageUrls", rt.getImageUrls() != null ? rt.getImageUrls() : java.util.List.of());
            item.put("totalPhysicalRooms", totalPhysicalRooms);
            item.put("availableRooms", availableRooms);
            item.put("isAvailable", isAvailable);
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

        // Kiểm tra xem loại phòng còn phòng trống cho khoảng ngày này hay không
        long availableRooms = calculateAvailableRoomsForRange(roomType.getId(), req.getCheckInDate(), req.getCheckOutDate());
        if (availableRooms <= 0) {
            throw new IllegalArgumentException(String.format(
                    "Loại phòng '%s' đã hết phòng trống cho khoảng thời gian từ %s đến %s. Vui lòng chọn ngày khác hoặc loại phòng khác.",
                    roomType.getName(), req.getCheckInDate(), req.getCheckOutDate()
            ));
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

    // === STAFF: Thống kê số lượng yêu cầu đang chờ duyệt (để hiển thị badge thông báo cho Lễ tân) ===
    @GetMapping("/api/v1/booking-requests/pending-count")
    public ResponseEntity<Map<String, Long>> getPendingCount(HttpServletRequest request) {
        checkStaff(request);
        long individual = bookingRequestRepository.countByStatus(BookingRequestStatus.PENDING);
        long group = publicGroupBookingRequestRepository != null 
                ? publicGroupBookingRequestRepository.countByStatus(plant.stay.model.PublicGroupBookingRequestStatus.PENDING) 
                : 0L;
        return ResponseEntity.ok(Map.of(
                "individualPending", individual,
                "groupPending", group,
                "totalPending", individual + group
        ));
    }

    // === STAFF: Duyệt yêu cầu ===
    @org.springframework.transaction.annotation.Transactional
    @PutMapping("/api/v1/booking-requests/{id}/approve")
    public ResponseEntity<BookingRequestResponse> approve(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkStaff(request);
        BookingRequest req = findById(id);
        if (req.getStatus() != BookingRequestStatus.PENDING)
            throw new IllegalArgumentException("Yêu cầu này không ở trạng thái chờ duyệt");

        // Kiểm tra xem khi duyệt có còn phòng trống hay không
        long availableRooms = calculateAvailableRoomsForRange(req.getRoomType().getId(), req.getCheckInDate(), req.getCheckOutDate());
        if (availableRooms <= 0) {
            throw new IllegalArgumentException(String.format(
                    "Không thể duyệt! Loại phòng '%s' đã hết phòng trống cho khoảng thời gian từ %s đến %s.",
                    req.getRoomType().getName(), req.getCheckInDate(), req.getCheckOutDate()
            ));
        }

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

    private long calculateAvailableRoomsForRange(Long roomTypeId, LocalDate checkIn, LocalDate checkOut) {
        List<Room> allRooms = roomRepository.findByRoomTypeId(roomTypeId);
        if (allRooms.isEmpty()) return 0;
        long totalPhysicalRooms = allRooms.size();
        List<Booking> activeBookings = bookingRepository.findActiveOverlappingByRoomTypeAndRange(
                roomTypeId, checkIn, checkOut);
        LocalDate today = LocalDate.now();

        long minAvailable = totalPhysicalRooms;
        for (LocalDate d = checkIn; d.isBefore(checkOut); d = d.plusDays(1)) {
            final LocalDate cur = d;
            java.util.Set<Long> occupiedRoomIds = new java.util.HashSet<>();
            int unassignedBookingCount = 0;

            for (Booking b : activeBookings) {
                if (!b.getCheckInDate().isAfter(cur) && b.getCheckOutDate().isAfter(cur)) {
                    if (b.getRoom() != null) {
                        occupiedRoomIds.add(b.getRoom().getId());
                    } else {
                        unassignedBookingCount++;
                    }
                }
            }

            for (Room r : allRooms) {
                if (r.getStatus() == RoomStatus.MAINTENANCE) {
                    occupiedRoomIds.add(r.getId());
                } else if (cur.equals(today) && r.getStatus() == RoomStatus.OCCUPIED) {
                    occupiedRoomIds.add(r.getId());
                }
            }

            long totalOccupied = occupiedRoomIds.size() + unassignedBookingCount;
            long avail = totalPhysicalRooms - totalOccupied;
            if (avail < minAvailable) {
                minAvailable = avail;
            }
        }
        return Math.max(0, minAvailable);
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

    private InvoiceResponse toInvoiceResponse(Invoice inv) {
        if (inv == null) return null;
        return InvoiceResponse.builder()
                .id(inv.getId())
                .bookingId(inv.getBooking() != null ? inv.getBooking().getId() : null)
                .groupBookingId(inv.getGroupBooking() != null ? inv.getGroupBooking().getId() : null)
                .mode(inv.getMode())
                .roomAmount(inv.getRoomAmount())
                .serviceAmount(inv.getServiceAmount())
                .discountAmount(inv.getDiscountAmount())
                .totalAmount(inv.getTotalAmount())
                .status(inv.getStatus())
                .adjustmentOfId(inv.getAdjustmentOf() != null ? inv.getAdjustmentOf().getId() : null)
                .note(inv.getNote())
                .cancelReason(inv.getCancelReason())
                .cancelledByName(inv.getCancelledBy() != null ? inv.getCancelledBy().getName() : null)
                .cancelledAt(inv.getCancelledAt())
                .createdAt(inv.getCreatedAt())
                .build();
    }

    private boolean isPhoneMatch(String registered, String input) {
        if (registered == null || input == null) return false;
        String regClean = registered.replaceAll("[^0-9]", "");
        String inClean = input.replaceAll("[^0-9]", "");
        if (regClean.equals(inClean)) return true;
        if (regClean.startsWith("84") && inClean.equals("0" + regClean.substring(2))) return true;
        if (inClean.startsWith("84") && regClean.equals("0" + inClean.substring(2))) return true;
        return false;
    }
}
