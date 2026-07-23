package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.dto.response.AvailableRoomResponse;
import roomi.dev.dto.response.BookingSlotResponse;
import roomi.dev.dto.response.RoomCalendarResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Booking;
import roomi.dev.model.Room;
import roomi.dev.model.RoomType;
import roomi.dev.model.SeasonalRate;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.RoomRepository;
import roomi.dev.repository.RoomTypeRepository;
import roomi.dev.repository.SeasonalRateRepository;
import roomi.dev.service.CalendarService;
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
@Transactional(readOnly = true)
public class CalendarServiceImpl implements CalendarService {

    private final RoomRepository         roomRepository;
    private final RoomTypeRepository     roomTypeRepository;
    private final BookingRepository      bookingRepository;
    private final SeasonalRateRepository seasonalRateRepository;
    private final BookingConflictChecker conflictChecker;

    // ======================================================== CALENDAR VIEW

    @Override
    public RoomCalendarResponse getRoomCalendar(Long roomId,
                                                LocalDate checkIn,
                                                LocalDate checkOut) {
        TimeRangeValidator.validateDateOrder(checkIn, checkOut);

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(
                        "Không tìm thấy phòng với id = " + roomId,
                        ErrorCode.INVALID_INPUT));

        List<Booking> bookings = bookingRepository
                .findActiveBookingsByRoomAndDateRange(roomId, checkIn, checkOut);

        return toRoomCalendarResponse(room, bookings);
    }

    @Override
    public List<RoomCalendarResponse> getAllRoomsCalendar(LocalDate checkIn,
                                                          LocalDate checkOut) {
        TimeRangeValidator.validateDateOrder(checkIn, checkOut);

        List<Room> rooms = roomRepository.findAll();
        TimeSlot slot = TimeSlot.of(checkIn, checkOut);

        return rooms.stream()
                .map(room -> {
                    List<Booking> bookings = bookingRepository
                            .findActiveBookingsByRoomAndDateRange(
                                    room.getId(), slot.getStartDate(), slot.getEndDate());
                    return toRoomCalendarResponse(room, bookings);
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<RoomCalendarResponse> getRoomCalendarByType(Long roomTypeId,
                                                            LocalDate checkIn,
                                                            LocalDate checkOut) {
        TimeRangeValidator.validateDateOrder(checkIn, checkOut);

        validateRoomTypeExists(roomTypeId);

        List<Room> rooms = roomRepository.findByRoomTypeId(roomTypeId);
        TimeSlot slot = TimeSlot.of(checkIn, checkOut);

        return rooms.stream()
                .map(room -> {
                    List<Booking> bookings = bookingRepository
                            .findActiveBookingsByRoomAndDateRange(
                                    room.getId(), slot.getStartDate(), slot.getEndDate());
                    return toRoomCalendarResponse(room, bookings);
                })
                .collect(Collectors.toList());
    }

    // ======================================================== AVAILABLE ROOMS

    @Override
    public List<AvailableRoomResponse> getAvailableRooms(Long roomTypeId,
                                                         LocalDate checkIn,
                                                         LocalDate checkOut) {
        TimeRangeValidator.validateDateOrder(checkIn, checkOut);

        TimeSlot slot = TimeSlot.of(checkIn, checkOut);

        // Lấy danh sách phòng (theo loại hoặc tất cả)
        List<Room> candidates = (roomTypeId != null)
                ? roomRepository.findByRoomTypeId(roomTypeId)
                : roomRepository.findAll();

        // Lọc phòng không bị trùng lịch + không đang MAINTENANCE
        List<Room> available = conflictChecker.filterAvailableRooms(candidates, slot)
                .stream()
                .filter(r -> r.getStatus() != Room.Status.MAINTENANCE)
                .collect(Collectors.toList());

        return available.stream()
                .map(room -> toAvailableRoomResponse(room, slot))
                .collect(Collectors.toList());
    }

    // ======================================================== PRIVATE HELPERS

    private RoomCalendarResponse toRoomCalendarResponse(Room room, List<Booking> bookings) {
        List<BookingSlotResponse> slots = bookings.stream()
                .map(this::toBookingSlotResponse)
                .collect(Collectors.toList());

        return RoomCalendarResponse.builder()
                .roomId(room.getId())
                .roomNumber(room.getRoomNumber())
                .floor(room.getFloor())
                .status(room.getStatus().name())
                .roomTypeId(room.getRoomType().getId())
                .roomTypeName(room.getRoomType().getName())
                .bookings(slots)
                .build();
    }

    private BookingSlotResponse toBookingSlotResponse(Booking b) {
        int nights = (int) ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate());
        return BookingSlotResponse.builder()
                .bookingId(b.getId())
                .guestName(b.getGuest().getFullName())
                .guestPhone(b.getGuest().getPhone())
                .guestIdNumber(b.getGuest().getIdNumber())
                .checkInDate(b.getCheckInDate())
                .checkOutDate(b.getCheckOutDate())
                .nights(nights)
                .status(b.getStatus().name())
                .expectedPrice(b.getExpectedPrice())
                .build();
    }

    private AvailableRoomResponse toAvailableRoomResponse(Room room, TimeSlot slot) {
        RoomType roomType = room.getRoomType();
        BigDecimal price  = calcExpectedPrice(roomType, slot);
        int nights        = (int) slot.getNights();

        return AvailableRoomResponse.builder()
                .roomId(room.getId())
                .roomNumber(room.getRoomNumber())
                .floor(room.getFloor())
                .roomTypeId(roomType.getId())
                .roomTypeName(roomType.getName())
                .capacity(roomType.getCapacity())
                .amenities(roomType.getAmenities())
                .expectedPrice(price)
                .nights(nights)
                .build();
    }

    /**
     * Tính giá dự kiến theo SeasonalRate: duyệt từng đêm trong slot,
     * nếu nằm trong SeasonalRate thì dùng giá đó, ngược lại dùng basePrice.
     */
    private BigDecimal calcExpectedPrice(RoomType roomType, TimeSlot slot) {
        List<SeasonalRate> rates = seasonalRateRepository
                .findByRoomTypeId(roomType.getId());

        BigDecimal total = BigDecimal.ZERO;
        LocalDate night = slot.getStartDate();

        while (night.isBefore(slot.getEndDate())) {
            final LocalDate currentNight = night;
            BigDecimal nightPrice = rates.stream()
                    .filter(r -> !currentNight.isBefore(r.getStartDate())
                              && !currentNight.isAfter(r.getEndDate()))
                    .map(SeasonalRate::getPrice)
                    .findFirst()
                    .orElse(roomType.getBasePrice());

            total = total.add(nightPrice);
            night = night.plusDays(1);
        }

        return total;
    }

    private void validateRoomTypeExists(Long roomTypeId) {
        if (!roomTypeRepository.existsById(roomTypeId)) {
            throw new BusinessException(
                    "Không tìm thấy loại phòng với id = " + roomTypeId,
                    ErrorCode.INVALID_INPUT);
        }
    }
}
