package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.dto.request.BookingRequest;
import roomi.dev.dto.response.BookingResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.*;
import roomi.dev.repository.*;
import roomi.dev.service.BookingService;
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
    private final GuestServiceImpl       guestService;       // dùng lại findById()
    private final BookingConflictChecker conflictChecker;    // kiểm tra xung đột lịch

    // ================================================================== CREATE

    @Override
    @Transactional
    public BookingResponse createBooking(BookingRequest request, User createdBy) {
        // Dùng TimeRangeValidator — kiểm tra đầy đủ: thứ tự ngày + không trong quá khứ
        TimeRangeValidator.validate(request.getCheckInDate(), request.getCheckOutDate());

        Guest guest = guestService.findById(request.getGuestId());

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new BusinessException(
                        "Không tìm thấy loại phòng", ErrorCode.INVALID_INPUT));

        Room room = null;
        BigDecimal expectedPrice = BigDecimal.ZERO;

        if (request.getRoomId() != null) {
            TimeSlot slot = TimeSlot.of(request.getCheckInDate(), request.getCheckOutDate());
            // Dùng BookingConflictChecker — kiểm tra roomType khớp + không trùng lịch
            room = conflictChecker.validateAndGetRoom(
                    request.getRoomId(), roomType, slot, -1L);
            expectedPrice = calcExpectedPrice(roomType, slot);
        }

        Booking booking = Booking.builder()
                .guest(guest)
                .roomType(roomType)
                .room(room)
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .source(parseSource(request.getSource()))
                .expectedPrice(expectedPrice)
                .createdBy(createdBy)
                .build();

        return toResponse(bookingRepository.save(booking));
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
        booking.setExpectedPrice(calcExpectedPrice(booking.getRoomType(), slot));
        markRoomAsReserved(room);

        return toResponse(bookingRepository.save(booking));
    }

    // ================================================================== STATUS TRANSITIONS

    @Override
    @Transactional
    public BookingResponse confirmBooking(Long bookingId) {
        Booking booking = findById(bookingId);
        requireStatus(booking, Booking.Status.NEW);
        booking.setStatus(Booking.Status.CONFIRMED);
        if (booking.getRoom() != null) {
            markRoomAsReserved(booking.getRoom());
        }
        return toResponse(bookingRepository.save(booking));
    }

    @Override
    @Transactional
    public BookingResponse checkIn(Long bookingId) {
        Booking booking = findById(bookingId);
        requireStatus(booking, Booking.Status.CONFIRMED);

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

        // Chỉ trả phòng về AVAILABLE nếu trạng thái hiện tại là RESERVED.
        if (booking.getRoom() != null && booking.getRoom().getStatus() == Room.Status.RESERVED) {
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
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<BookingResponse> getBookingsByGuest(Long guestId) {
        return bookingRepository.findByGuestId(guestId).stream()
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
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<BookingResponse> searchBookings(String guestName, String phone, String idNumber,
                                                 Long roomTypeId, LocalDate fromDate, LocalDate toDate) {
        if (fromDate != null && toDate != null && toDate.isBefore(fromDate)) {
            throw new BusinessException(
                    "fromDate phải trước hoặc bằng toDate",
                    ErrorCode.INVALID_DATE_RANGE);
        }

        return bookingRepository.searchBookings(
                        normalizeSearchTerm(guestName),
                        normalizeSearchTerm(phone),
                        normalizeSearchTerm(idNumber),
                        roomTypeId,
                        fromDate,
                        toDate)
                .stream()
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

    private void requireStatus(Booking booking, Booking.Status expected) {
        if (booking.getStatus() != expected) {
            throw new BusinessException(
                    "Booking phải ở trạng thái " + expected
                    + " (hiện tại: " + booking.getStatus() + ")",
                    ErrorCode.BOOKING_INVALID_STATUS);
        }
    }

    private void markRoomAsReserved(Room room) {
        if (room.getStatus() == Room.Status.AVAILABLE) {
            room.setStatus(Room.Status.RESERVED);
            roomRepository.save(room);
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

    private String normalizeSearchTerm(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private BookingResponse toResponse(Booking b) {
        long nights = ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate());
        return BookingResponse.builder()
                .id(b.getId())
                .guestId(b.getGuest().getId())
                .guestName(b.getGuest().getFullName())
                .guestPhone(b.getGuest().getPhone())
                .roomTypeId(b.getRoomType().getId())
                .roomTypeName(b.getRoomType().getName())
                .roomId(b.getRoom() != null ? b.getRoom().getId() : null)
                .roomNumber(b.getRoom() != null ? b.getRoom().getRoomNumber() : null)
                .checkInDate(b.getCheckInDate())
                .checkOutDate(b.getCheckOutDate())
                .nights((int) nights)
                .status(b.getStatus().name())
                .source(b.getSource().name())
                .expectedPrice(b.getExpectedPrice())
                .createdById(b.getCreatedBy().getId())
                .createdByName(b.getCreatedBy().getFullName())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
