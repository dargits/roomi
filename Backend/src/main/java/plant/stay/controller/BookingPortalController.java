package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.BookingRequestDto;
import plant.stay.dto.response.BookingRequestResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.RoomTypeResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.impl.GuestServiceImpl;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;
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

    // === PUBLIC: Xem phòng trống ===
    @GetMapping("/api/v1/room-types/public/availability")
    public ResponseEntity<?> availability(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        // Lấy các loại phòng active, rồi kiểm tra xem có phòng nào không bị đặt kín không
        List<RoomType> activeTypes = roomTypeRepository.findByActiveTrue();
        return ResponseEntity.ok(activeTypes.stream().map(rt -> {
            long bookedRooms = bookingRepository.findForCalendar(from, to).stream()
                    .filter(b -> b.getRoom() != null && b.getRoomType().getId().equals(rt.getId())).count();
            long totalRooms = bookingRepository.findByRoomId(-1L).size(); // Placeholder
            return java.util.Map.of(
                    "roomTypeId", rt.getId(),
                    "name", rt.getName(),
                    "basePrice", rt.getBasePrice(),
                    "maxCapacity", rt.getMaxCapacity(),
                    "imageUrls", rt.getImageUrls()
            );
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
        Guest guest = guestRepository.findByPhone(req.getPhone()).orElseGet(() -> {
            Guest g = Guest.builder().name(req.getGuestName()).phone(req.getPhone()).email(req.getEmail()).build();
            return guestRepository.save(g);
        });

        // Tính giá dự kiến cơ bản (tạm tính theo basePrice, chưa gồm seasonal price để đơn giản)
        long nights = java.time.temporal.ChronoUnit.DAYS.between(req.getCheckInDate(), req.getCheckOutDate());
        java.math.BigDecimal expectedPrice = req.getRoomType().getBasePrice().multiply(java.math.BigDecimal.valueOf(nights > 0 ? nights : 1));

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
        return BookingRequestResponse.builder()
                .id(r.getId()).guestName(r.getGuestName()).phone(r.getPhone()).email(r.getEmail())
                .roomTypeId(r.getRoomType().getId()).roomTypeName(r.getRoomType().getName())
                .checkInDate(r.getCheckInDate()).checkOutDate(r.getCheckOutDate())
                .note(r.getNote()).status(r.getStatus()).rejectReason(r.getRejectReason())
                .convertedBookingId(r.getConvertedBooking() != null ? r.getConvertedBooking().getId() : null)
                .createdAt(r.getCreatedAt())
                .build();
    }
}
