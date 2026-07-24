package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.dto.request.BookingRequest;
import roomi.dev.dto.request.BookingSurchargeUsageRequest;
import roomi.dev.dto.request.ChangeRoomRequest;
import roomi.dev.dto.response.BookingResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.*;
import roomi.dev.repository.*;
import roomi.dev.service.BookingService;
import roomi.dev.service.GuestService;
import roomi.dev.util.time.BookingConflictChecker;
import roomi.dev.util.time.TimeRangeValidator;
import roomi.dev.util.time.TimeSlot;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository      bookingRepository;
    private final RoomRepository         roomRepository;
    private final RoomTypeRepository     roomTypeRepository;
    private final SeasonalRateRepository seasonalRateRepository;
    private final GuestService           guestService;       // inject interface thay vì impl
    private final BookingConflictChecker conflictChecker;    // kiểm tra xung đột lịch
    private final UserRepository         userRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private BookingSurchargeUsageRepository bookingSurchargeUsageRepository;

    @Autowired
    private SurchargeServiceRepository surchargeServiceRepository;

    // ================================================================== CREATE

    @Override
    @Transactional
    public BookingResponse createBooking(BookingRequest request, User createdBy) {
        // Dùng TimeRangeValidator — kiểm tra đầy đủ: thứ tự ngày + không trong quá khứ
        TimeRangeValidator.validate(request.getCheckInDate(), request.getCheckOutDate());

        if (createdBy == null) {
            createdBy = userRepository.findAll().stream().findFirst().orElse(null);
        }

        // Tìm khách theo CCCD/SĐT, nếu chưa có thì tạo mới
        Guest guest = guestService.findOrCreateGuest(
                request.getIdNumber(),
                request.getFullName(),
                request.getPhone(),
                request.getEmail(),
                request.getNote()
        );

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new BusinessException(
                        "Không tìm thấy loại phòng", ErrorCode.INVALID_INPUT));

        Room room = null;
        TimeSlot slot = TimeSlot.of(request.getCheckInDate(), request.getCheckOutDate());

        if (request.getRoomId() != null) {
            // Dùng BookingConflictChecker — kiểm tra roomType khớp + không trùng lịch
            room = conflictChecker.validateAndGetRoom(
                    request.getRoomId(), roomType, slot, -1L);
        }
        BigDecimal expectedPrice = calcExpectedPrice(roomType, slot);

        Booking booking = Booking.builder()
                .guest(guest)
                .roomType(roomType)
                .room(room)
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .source(parseSource(request.getSource()))
                .status(room != null ? Booking.Status.CONFIRMED : Booking.Status.NEW)
                .expectedPrice(expectedPrice)
                .createdBy(createdBy)
                .build();

        Booking savedBooking = bookingRepository.save(booking);
        addInitialServiceUsages(savedBooking, request.getInitialServiceUsages(), createdBy);
        return toResponse(savedBooking);
    }

    // ================================================================== ASSIGN ROOM

    @Override
    @Transactional
    public BookingResponse assignRoom(Long bookingId, Long roomId) {
        Booking booking = findById(bookingId);

        // Chỉ cho phép gán phòng khi trạng thái còn NEW hoặc CONFIRMED
        if (booking.getStatus() != Booking.Status.NEW
                && booking.getStatus() != Booking.Status.CONFIRMED) {
            throw new BusinessException(
                    "Không thể gán phòng cho booking ở trạng thái " + booking.getStatus(),
                    ErrorCode.BOOKING_INVALID_STATUS);
        }

        TimeSlot slot = TimeSlot.of(booking.getCheckInDate(), booking.getCheckOutDate());

        // BookingConflictChecker kiểm tra:
        //   1. Phòng tồn tại
        //   2. RoomType của phòng khớp booking
        //   3. Không bị chồng lấn thời gian với booking khác (loại trừ chính booking này)
        Room room = conflictChecker.validateAndGetRoom(
                roomId, booking.getRoomType(), slot, bookingId);

        booking.setRoom(room);
        booking.setStatus(Booking.Status.CONFIRMED);
        booking.setExpectedPrice(calcExpectedPrice(booking.getRoomType(), slot));

        // Nếu khoảng thời gian nhận-trả phòng bao gồm hôm nay, cập nhật trạng thái phòng sang OCCUPIED
        LocalDate today = LocalDate.now();
        if (!today.isBefore(booking.getCheckInDate()) && today.isBefore(booking.getCheckOutDate())) {
            room.setStatus(Room.Status.OCCUPIED);
            roomRepository.save(room);
        }

        return toResponse(bookingRepository.save(booking));
    }

    // ================================================================== CHANGE ROOM

    @Override
    @Transactional
    public BookingResponse changeRoom(Long bookingId, ChangeRoomRequest request) {
        Booking booking = findById(bookingId);

        // Theo docs: chỉ cho phép khi CONFIRMED hoặc CHECKED_IN
        if (booking.getStatus() != Booking.Status.CONFIRMED
                && booking.getStatus() != Booking.Status.CHECKED_IN) {
            throw new BusinessException(
                    "Chỉ có thể đổi phòng khi booking ở trạng thái CONFIRMED hoặc CHECKED_IN"
                    + " (hiện tại: " + booking.getStatus() + ")",
                    ErrorCode.BOOKING_INVALID_STATUS);
        }

        // Theo docs: booking phải đã có phòng, nếu không → dùng assign-room
        Room currentRoom = booking.getRoom();
        if (currentRoom == null) {
            throw new BusinessException(
                    "Booking chưa được gán phòng, vui lòng dùng assign-room thay vì change-room",
                    ErrorCode.BOOKING_NO_ROOM);
        }

        // Theo docs: phòng mới không được trùng phòng hiện tại
        if (currentRoom.getId().equals(request.getRoomId())) {
            throw new BusinessException(
                    "Phòng mới phải khác phòng hiện tại (phòng " + currentRoom.getRoomNumber() + ")",
                    ErrorCode.ROOM_SAME_AS_CURRENT);
        }

        TimeSlot slot = TimeSlot.of(booking.getCheckInDate(), booking.getCheckOutDate());

        // Validate phòng mới: tồn tại + đúng roomType + không trùng lịch
        // excludeBookingId = bookingId để không tự xung đột với chính mình
        Room newRoom = conflictChecker.validateAndGetRoom(
                request.getRoomId(), booking.getRoomType(), slot, bookingId);

        // Theo docs — logic trạng thái phòng:
        // CONFIRMED:  phòng cũ → AVAILABLE,       phòng mới giữ nguyên
        // CHECKED_IN: phòng cũ → NEEDS_CLEANING,  phòng mới → OCCUPIED
        if (booking.getStatus() == Booking.Status.CHECKED_IN) {
            currentRoom.setStatus(Room.Status.NEEDS_CLEANING);
            newRoom.setStatus(Room.Status.OCCUPIED);
        } else {
            // CONFIRMED
            currentRoom.setStatus(Room.Status.AVAILABLE);
        }

        roomRepository.save(currentRoom);
        roomRepository.save(newRoom);

        booking.setRoom(newRoom);
        booking.setExpectedPrice(calcExpectedPrice(booking.getRoomType(), slot));

        return toResponse(bookingRepository.save(booking));
    }

    // ================================================================== STATUS TRANSITIONS

    @Override
    @Transactional
    public BookingResponse confirmBooking(Long bookingId) {
        Booking booking = findById(bookingId);
        requireStatus(booking, Booking.Status.NEW);
        booking.setStatus(Booking.Status.CONFIRMED);
        return toResponse(bookingRepository.save(booking));
    }

    @Override
    @Transactional
    public BookingResponse checkIn(Long bookingId) {
        Booking booking = findById(bookingId);
        
        if (booking.getStatus() != Booking.Status.CONFIRMED && booking.getStatus() != Booking.Status.NEW) {
            throw new BusinessException(
                    "Booking phải ở trạng thái CONFIRMED hoặc NEW (hiện tại: " + booking.getStatus() + ")",
                    ErrorCode.BOOKING_INVALID_STATUS);
        }

        if (booking.getRoom() == null) {
            throw new BusinessException(
                    "Booking chưa được gán phòng, không thể check-in",
                    ErrorCode.BOOKING_INVALID_STATUS);
        }

        // Đổi trạng thái phòng → OCCUPIED
        Room room = booking.getRoom();
        room.setStatus(Room.Status.OCCUPIED);
        roomRepository.save(room);

        booking.setStatus(Booking.Status.CHECKED_IN);
        return toResponse(bookingRepository.save(booking));
    }

    @Override
    @Transactional
    public BookingResponse checkOut(Long bookingId) {
        Booking booking = findById(bookingId);
        requireStatus(booking, Booking.Status.CHECKED_IN);

        // Đổi trạng thái phòng → NEEDS_CLEANING
        Room room = booking.getRoom();
        room.setStatus(Room.Status.NEEDS_CLEANING);
        roomRepository.save(room);

        booking.setStatus(Booking.Status.CHECKED_OUT);
        return toResponse(bookingRepository.save(booking));
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(Long bookingId) {
        Booking booking = findById(bookingId);

        if (booking.getStatus() == Booking.Status.CHECKED_IN
                || booking.getStatus() == Booking.Status.CHECKED_OUT) {
            throw new BusinessException(
                    "Không thể huỷ booking ở trạng thái " + booking.getStatus(),
                    ErrorCode.BOOKING_INVALID_STATUS);
        }

        // Trả phòng về AVAILABLE nếu đã gán
        if (booking.getRoom() != null) {
            Room room = booking.getRoom();
            room.setStatus(Room.Status.AVAILABLE);
            roomRepository.save(room);
        }

        booking.setStatus(Booking.Status.CANCELLED);
        return toResponse(bookingRepository.save(booking));
    }

    // ================================================================== QUERIES

    @Override
    public BookingResponse getBookingById(Long id) {
        return toResponse(findById(id));
    }

    @Override
    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAll().stream()
                .sorted((b1, b2) -> Long.compare(b1.getId(), b2.getId()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<BookingResponse> getBookingsByGuest(Long guestId) {
        return bookingRepository.findByGuestId(guestId).stream()
                .sorted((b1, b2) -> Long.compare(b1.getId(), b2.getId()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<BookingResponse> getBookingsByStatus(String status) {
        Booking.Status s;
        try {
            s = Booking.Status.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Trạng thái không hợp lệ: " + status, ErrorCode.INVALID_INPUT);
        }
        return bookingRepository.findByStatus(s).stream()
                .sorted((b1, b2) -> Long.compare(b1.getId(), b2.getId()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ================================================================== PRIVATE HELPERS

    /**
     * Tính expectedPrice theo SeasonalRate.
     * Thuật toán: duyệt từng đêm trong slot — nếu ngày đó nằm trong SeasonalRate thì dùng
     * giá đó, ngược lại fallback về basePrice của roomType.
     *
     * Ví dụ: check-in 2026-09-28, check-out 2026-10-02 → 4 đêm:
     *   đêm 28/9, 29/9 → dùng rate tháng 9
     *   đêm 30/9, 01/10 → dùng rate tháng 10
     */
    private BigDecimal calcExpectedPrice(RoomType roomType, TimeSlot slot) {
        List<SeasonalRate> rates = seasonalRateRepository.findByRoomTypeId(roomType.getId());

        BigDecimal total = BigDecimal.ZERO;
        LocalDate night = slot.getStartDate();   // mỗi vòng lặp = 1 đêm

        while (night.isBefore(slot.getEndDate())) {
            final LocalDate currentNight = night;   // effectively final cho lambda
            BigDecimal nightPrice = rates.stream()
                    .filter(r -> !currentNight.isBefore(r.getStartDate())
                              && !currentNight.isAfter(r.getEndDate()))
                    .map(SeasonalRate::getPrice)
                    .findFirst()
                    .orElse(roomType.getBasePrice());   // fallback basePrice

            total = total.add(nightPrice);
            night = night.plusDays(1);
        }

        return total;
    }

    private void addInitialServiceUsages(Booking booking,
                                         List<BookingSurchargeUsageRequest> requests,
                                         User recordedBy) {
        if (requests == null || requests.isEmpty()) {
            return;
        }

        BigDecimal serviceCharge = BigDecimal.ZERO;
        for (BookingSurchargeUsageRequest request : requests) {
            SurchargeService service = surchargeServiceRepository.findById(request.getSurchargeServiceId())
                    .orElseThrow(() -> new BusinessException(
                            "Không tìm thấy dịch vụ phụ thu", ErrorCode.SURCHARGE_SERVICE_NOT_FOUND));
            if (!Boolean.TRUE.equals(service.getActive())) {
                throw new BusinessException(
                        "Dịch vụ phụ thu đã ngừng hoạt động", ErrorCode.SURCHARGE_SERVICE_INACTIVE);
            }

            BigDecimal lineTotal = service.getUnitPrice()
                    .multiply(BigDecimal.valueOf(request.getQuantity().longValue()));
            bookingSurchargeUsageRepository.save(BookingSurchargeUsage.builder()
                    .booking(booking)
                    .surchargeService(service)
                    .serviceName(service.getName())
                    .unitPrice(service.getUnitPrice())
                    .quantity(request.getQuantity())
                    .lineTotal(lineTotal)
                    .note(normalizeOptional(request.getNote()))
                    .recordedBy(recordedBy)
                    .build());
            serviceCharge = serviceCharge.add(lineTotal);
        }

        BigDecimal roomCharge = booking.getExpectedPrice() == null ? BigDecimal.ZERO : booking.getExpectedPrice();
        invoiceRepository.save(Invoice.builder()
                .booking(booking)
                .roomCharge(roomCharge)
                .serviceCharge(serviceCharge)
                .discount(BigDecimal.ZERO)
                .totalAmount(roomCharge.add(serviceCharge))
                .status(Invoice.Status.PENDING)
                .build());
    }

    private void requireStatus(Booking booking, Booking.Status expected) {
        if (booking.getStatus() != expected) {
            throw new BusinessException(
                    "Booking phải ở trạng thái " + expected
                    + " (hiện tại: " + booking.getStatus() + ")",
                    ErrorCode.BOOKING_INVALID_STATUS);
        }
    }

    private Booking findById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new BusinessException(
                        "Không tìm thấy booking", ErrorCode.BOOKING_NOT_FOUND));
    }

    private Booking.Source parseSource(String source) {
        if (source == null || source.isBlank()) return Booking.Source.WALK_IN;
        try {
            return Booking.Source.valueOf(source.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Source không hợp lệ: " + source, ErrorCode.INVALID_INPUT);
        }
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private BookingResponse toResponse(Booking b) {
        long nights = (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                ? ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate())
                : 0;
        Invoice invoice = invoiceRepository == null
            ? null
            : invoiceRepository.findByBookingId(b.getId()).orElse(null);
        BigDecimal roomCharge = invoice != null && invoice.getRoomCharge() != null
            ? invoice.getRoomCharge() : b.getExpectedPrice();
        BigDecimal serviceCharge = invoice != null && invoice.getServiceCharge() != null
            ? invoice.getServiceCharge() : BigDecimal.ZERO;
        BigDecimal totalAmount = invoice != null && invoice.getTotalAmount() != null
            ? invoice.getTotalAmount() : roomCharge != null ? roomCharge.add(serviceCharge) : serviceCharge;

        return BookingResponse.builder()
                .id(b.getId())
                .guestId(b.getGuest() != null ? b.getGuest().getId() : null)
                .guestName(b.getGuest() != null ? b.getGuest().getFullName() : null)
                .guestFullName(b.getGuest() != null ? b.getGuest().getFullName() : null)
                .guestPhone(b.getGuest() != null ? b.getGuest().getPhone() : null)
                .guestIdNumber(b.getGuest() != null ? b.getGuest().getIdNumber() : null)
                .guestEmail(b.getGuest() != null ? b.getGuest().getEmail() : null)
                .roomTypeId(b.getRoomType() != null ? b.getRoomType().getId() : null)
                .roomTypeName(b.getRoomType() != null ? b.getRoomType().getName() : null)
                .roomId(b.getRoom() != null ? b.getRoom().getId() : null)
                .roomNumber(b.getRoom() != null ? b.getRoom().getRoomNumber() : null)
                .checkInDate(b.getCheckInDate())
                .checkOutDate(b.getCheckOutDate())
                .nights((int) nights)
                .status(b.getStatus() != null ? b.getStatus().name() : null)
                .source(b.getSource() != null ? b.getSource().name() : null)
                .note(b.getGuest() != null ? b.getGuest().getNote() : null)
                .expectedPrice(b.getExpectedPrice())
                .roomCharge(roomCharge)
                .serviceCharge(serviceCharge)
                .totalAmount(totalAmount)
                .createdById(b.getCreatedBy() != null ? b.getCreatedBy().getId() : null)
                .createdByName(b.getCreatedBy() != null ? b.getCreatedBy().getFullName() : null)
                .createdAt(b.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public BookingResponse updateBooking(Long id, BookingRequest request) {
        Booking booking = findById(id);

        // Dùng TimeRangeValidator - kiểm tra thứ tự ngày + không trong quá khứ khi update
        TimeRangeValidator.validate(request.getCheckInDate(), request.getCheckOutDate());

        // Tìm/cập nhật thông tin khách hàng
        Guest guest = guestService.findOrCreateGuest(
                request.getIdNumber(),
                request.getFullName(),
                request.getPhone(),
                request.getEmail(),
                request.getNote()
        );

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại phòng", ErrorCode.INVALID_INPUT));

        // Nếu thay đổi loại phòng hoặc thay đổi ngày, và đã gán phòng, ta cần kiểm tra xung đột hoặc hủy gán
        Room room = booking.getRoom();
        if (room != null) {
            if (!room.getRoomType().getId().equals(roomType.getId())) {
                // Đổi loại phòng thì hủy gán phòng cũ
                room = null;
            } else {
                // Cùng loại phòng nhưng đổi ngày, kiểm tra xem phòng cũ có bị trùng lịch mới không (loại trừ chính booking này)
                TimeSlot slot = TimeSlot.of(request.getCheckInDate(), request.getCheckOutDate());
                try {
                    room = conflictChecker.validateAndGetRoom(room.getId(), roomType, slot, id);
                } catch (BusinessException e) {
                    // Nếu bị trùng lịch thì hủy gán phòng cũ
                    room = null;
                }
            }
        }

        // Tính toán lại expectedPrice
        TimeSlot slot = TimeSlot.of(request.getCheckInDate(), request.getCheckOutDate());
        BigDecimal expectedPrice = calcExpectedPrice(roomType, slot);

        booking.setGuest(guest);
        booking.setRoomType(roomType);
        booking.setRoom(room);

        // Cập nhật trạng thái booking dựa trên việc gán phòng
        if (room == null && (booking.getStatus() == Booking.Status.NEW || booking.getStatus() == Booking.Status.CONFIRMED)) {
            booking.setStatus(Booking.Status.NEW);
        } else if (room != null && booking.getStatus() == Booking.Status.NEW) {
            booking.setStatus(Booking.Status.CONFIRMED);
        }

        booking.setCheckInDate(request.getCheckInDate());
        booking.setCheckOutDate(request.getCheckOutDate());
        booking.setSource(parseSource(request.getSource()));
        booking.setExpectedPrice(expectedPrice);

        if (booking.getCreatedBy() == null) {
            User fallbackUser = userRepository.findAll().stream().findFirst().orElse(null);
            booking.setCreatedBy(fallbackUser);
        }

        return toResponse(bookingRepository.save(booking));
    }

    @Override
    @Transactional
    public void deleteBooking(Long id) {
        Booking booking = findById(id);

        // Trả phòng về AVAILABLE nếu đã gán phòng và trạng thái không phải CHECKED_OUT hoặc CANCELLED
        if (booking.getRoom() != null && booking.getStatus() != Booking.Status.CHECKED_OUT && booking.getStatus() != Booking.Status.CANCELLED) {
            Room room = booking.getRoom();
            room.setStatus(Room.Status.AVAILABLE);
            roomRepository.save(room);
        }

        bookingRepository.delete(booking);
    }

    @Override
    public List<BookingResponse> searchBookings(String guestName, String phone, String idNumber, Long roomTypeId,
            LocalDate fromDate, LocalDate toDate) {
        List<Booking> allBookings = bookingRepository.findAll();

        return allBookings.stream()
                .filter(b -> {
                    if (guestName != null && !guestName.isBlank()) {
                        if (b.getGuest() == null || b.getGuest().getFullName() == null ||
                            !b.getGuest().getFullName().toLowerCase().contains(guestName.toLowerCase().trim())) {
                            return false;
                        }
                    }
                    if (phone != null && !phone.isBlank()) {
                        if (b.getGuest() == null || b.getGuest().getPhone() == null ||
                            !b.getGuest().getPhone().contains(phone.trim())) {
                            return false;
                        }
                    }
                    if (idNumber != null && !idNumber.isBlank()) {
                        if (b.getGuest() == null || b.getGuest().getIdNumber() == null ||
                            !b.getGuest().getIdNumber().contains(idNumber.trim())) {
                            return false;
                        }
                    }
                    if (roomTypeId != null) {
                        if (b.getRoomType() == null || !b.getRoomType().getId().equals(roomTypeId)) {
                            return false;
                        }
                    }
                    if (fromDate != null) {
                        if (b.getCheckInDate() == null || b.getCheckInDate().isBefore(fromDate)) {
                            return false;
                        }
                    }
                    if (toDate != null) {
                        if (b.getCheckOutDate() == null || b.getCheckOutDate().isAfter(toDate)) {
                            return false;
                        }
                    }
                    return true;
                })
                .sorted((b1, b2) -> Long.compare(b1.getId(), b2.getId()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}
