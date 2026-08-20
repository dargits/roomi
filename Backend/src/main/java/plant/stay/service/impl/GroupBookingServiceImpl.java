package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.GroupBookingRequest;
import plant.stay.dto.request.GroupBookingRoomRequest;
import plant.stay.dto.response.BookingResponse;
import plant.stay.dto.response.GroupBookingResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.GroupBookingService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupBookingServiceImpl implements GroupBookingService {

    private final GroupBookingRepository groupBookingRepository;
    private final BookingRepository bookingRepository;
    private final GuestRepository guestRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
    private final SeasonalPriceRepository seasonalPriceRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public GroupBookingResponse create(GroupBookingRequest request, User actor) {
        validateDates(request.getCheckInDate(), request.getCheckOutDate());
        Map<Long, Integer> requestedRooms = aggregateRequestedRooms(request.getRooms());
        Map<Long, RoomType> roomTypes = loadAndLockRoomTypes(requestedRooms.keySet());
        validateCapacity(requestedRooms, roomTypes, request.getCheckInDate(), request.getCheckOutDate());

        Guest representative = resolveRepresentative(request);
        GroupBooking groupBooking = groupBookingRepository.save(GroupBooking.builder()
                .representativeGuest(representative)
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .note(request.getNote())
                .createdBy(actor)
                .build());

        List<Booking> bookings = new ArrayList<>();
        for (Map.Entry<Long, Integer> entry : requestedRooms.entrySet()) {
            RoomType roomType = roomTypes.get(entry.getKey());
            BigDecimal price = calculatePrice(roomType, request.getCheckInDate(), request.getCheckOutDate());
            for (int index = 0; index < entry.getValue(); index++) {
                bookings.add(Booking.builder()
                        .groupBooking(groupBooking)
                        .guest(representative)
                        .roomType(roomType)
                        .checkInDate(request.getCheckInDate())
                        .checkOutDate(request.getCheckOutDate())
                        .status(BookingStatus.NEW)
                        .expectedPrice(price)
                        .actualPrice(price)
                        .note(request.getNote())
                        .createdBy(actor)
                        .build());
            }
        }
        bookings = bookingRepository.saveAll(bookings);
        auditLogService.log("GroupBooking", groupBooking.getId(), "CREATE", actor,
                "Tạo hồ sơ đoàn cho " + representative.getName() + " gồm " + bookings.size() + " phòng");
        return toResponse(groupBooking, bookings);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupBookingResponse> getAll() {
        return groupBookingRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(group -> toResponse(group, bookingRepository.findByGroupBookingId(group.getId())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public GroupBookingResponse getById(Long id) {
        GroupBooking groupBooking = groupBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ đặt phòng đoàn"));
        return toResponse(groupBooking, bookingRepository.findByGroupBookingId(id));
    }

    private Map<Long, Integer> aggregateRequestedRooms(List<GroupBookingRoomRequest> rooms) {
        Map<Long, Integer> requested = new LinkedHashMap<>();
        for (GroupBookingRoomRequest room : rooms) {
            requested.merge(room.getRoomTypeId(), room.getQuantity(), Integer::sum);
        }
        return requested;
    }

    private Map<Long, RoomType> loadAndLockRoomTypes(Set<Long> roomTypeIds) {
        Map<Long, RoomType> roomTypes = new HashMap<>();
        for (Long roomTypeId : roomTypeIds) {
            RoomType roomType = roomTypeRepository.findById(roomTypeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
            if (!roomType.isActive()) {
                throw new IllegalArgumentException("Loại phòng " + roomType.getName() + " hiện không hoạt động");
            }
            roomRepository.findByRoomTypeIdForUpdate(roomTypeId);
            roomTypes.put(roomTypeId, roomType);
        }
        return roomTypes;
    }

    private void validateCapacity(Map<Long, Integer> requestedRooms, Map<Long, RoomType> roomTypes,
                                  LocalDate checkInDate, LocalDate checkOutDate) {
        for (Map.Entry<Long, Integer> entry : requestedRooms.entrySet()) {
            long capacity = roomRepository.countByRoomTypeId(entry.getKey());
            long reserved = bookingRepository.countActiveOverlappingByRoomType(
                    entry.getKey(), checkInDate, checkOutDate);
            long remaining = Math.max(0, capacity - reserved);
            if (entry.getValue() > remaining) {
                throw new IllegalArgumentException("Loại phòng " + roomTypes.get(entry.getKey()).getName()
                        + " chỉ còn " + remaining + " phòng trống, không đủ " + entry.getValue() + " phòng yêu cầu");
            }
        }
    }

    private Guest resolveRepresentative(GroupBookingRequest request) {
        if (request.getRepresentativeGuestId() != null) {
            return guestRepository.findById(request.getRepresentativeGuestId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người đại diện đoàn"));
        }
        if (request.getRepresentativePhone() != null && !request.getRepresentativePhone().isBlank()) {
            Optional<Guest> existing = guestRepository.findByPhone(request.getRepresentativePhone().trim());
            if (existing.isPresent()) {
                return existing.get();
            }
        }
        return guestRepository.save(Guest.builder()
                .name(request.getRepresentativeName().trim())
                .phone(blankToNull(request.getRepresentativePhone()))
                .email(blankToNull(request.getRepresentativeEmail()))
                .idNumber(blankToNull(request.getRepresentativeIdNumber()))
                .build());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validateDates(LocalDate checkInDate, LocalDate checkOutDate) {
        if (!checkOutDate.isAfter(checkInDate)) {
            throw new IllegalArgumentException("Ngày trả phòng phải sau ngày nhận phòng");
        }
    }

    private BigDecimal calculatePrice(RoomType roomType, LocalDate checkInDate, LocalDate checkOutDate) {
        BigDecimal total = BigDecimal.ZERO;
        long nights = ChronoUnit.DAYS.between(checkInDate, checkOutDate);
        for (long index = 0; index < nights; index++) {
            LocalDate night = checkInDate.plusDays(index);
            List<?> seasonal = seasonalPriceRepository.findByRoomTypeAndDate(roomType.getId(), night);
            total = total.add(seasonal.isEmpty()
                    ? roomType.getBasePrice()
                    : ((SeasonalPrice) seasonal.get(0)).getPricePerNight());
        }
        return total;
    }

    private GroupBookingResponse toResponse(GroupBooking group, List<Booking> bookings) {
        int assignedRooms = (int) bookings.stream().filter(booking -> booking.getRoom() != null).count();
        int activeRooms = (int) bookings.stream().filter(booking -> booking.getStatus() != BookingStatus.CANCELLED
                && booking.getStatus() != BookingStatus.NO_SHOW).count();
        String status = deriveStatus(bookings, activeRooms, assignedRooms);
        BigDecimal expectedTotal = bookings.stream()
                .filter(booking -> booking.getStatus() != BookingStatus.CANCELLED && booking.getStatus() != BookingStatus.NO_SHOW)
                .map(Booking::getExpectedPrice)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return GroupBookingResponse.builder()
                .id(group.getId())
                .representativeGuestId(group.getRepresentativeGuest().getId())
                .representativeName(group.getRepresentativeGuest().getName())
                .representativePhone(group.getRepresentativeGuest().getPhone())
                .representativeEmail(group.getRepresentativeGuest().getEmail())
                .checkInDate(group.getCheckInDate())
                .checkOutDate(group.getCheckOutDate())
                .note(group.getNote())
                .status(status)
                .totalRooms(bookings.size())
                .assignedRooms(assignedRooms)
                .expectedTotal(expectedTotal)
                .bookings(bookings.stream().map(this::toBookingResponse).collect(Collectors.toList()))
                .createdAt(group.getCreatedAt())
                .build();
    }

    private String deriveStatus(List<Booking> bookings, int activeRooms, int assignedRooms) {
        if (activeRooms == 0) return "CANCELLED";
        if (bookings.stream().anyMatch(booking -> booking.getStatus() == BookingStatus.CHECKED_IN)) return "CHECKED_IN";
        if (bookings.stream().allMatch(booking -> booking.getStatus() == BookingStatus.CHECKED_OUT
                || booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.NO_SHOW)) return "COMPLETED";
        if (assignedRooms == 0) return "NEW";
        return assignedRooms == activeRooms ? "CONFIRMED" : "PARTIALLY_ASSIGNED";
    }

    private BookingResponse toBookingResponse(Booking booking) {
        return BookingResponse.builder()
                .id(booking.getId())
                .guestId(booking.getGuest().getId())
                .guestName(booking.getGuest().getName())
                .guestPhone(booking.getGuest().getPhone())
                .roomTypeId(booking.getRoomType().getId())
                .roomTypeName(booking.getRoomType().getName())
                .roomId(booking.getRoom() != null ? booking.getRoom().getId() : null)
                .roomNumber(booking.getRoom() != null ? booking.getRoom().getRoomNumber() : null)
                .checkInDate(booking.getCheckInDate())
                .checkOutDate(booking.getCheckOutDate())
                .status(booking.getStatus())
                .expectedPrice(booking.getExpectedPrice())
                .actualPrice(booking.getActualPrice())
                .note(booking.getNote())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}