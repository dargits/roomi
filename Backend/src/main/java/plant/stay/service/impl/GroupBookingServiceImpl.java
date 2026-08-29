package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.GroupBookingRequest;
import plant.stay.dto.request.GroupBookingRoomRequest;
import plant.stay.dto.request.GroupDepositCreateRequest;
import plant.stay.dto.request.GroupRoomAssignmentItemRequest;
import plant.stay.dto.request.GroupRoomAssignmentRequest;
import plant.stay.dto.response.BookingResponse;
import plant.stay.dto.response.GroupBookingResponse;
import plant.stay.dto.response.GroupCancelPreviewResponse;
import plant.stay.dto.response.GroupRoomAssignmentSuggestionResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.BookingService;
import plant.stay.service.GroupBookingService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final CancellationPolicyRepository cancellationPolicyRepository;
    private final DepositRepository depositRepository;
    private final DepositPolicyRepository depositPolicyRepository;
    private final AuditLogService auditLogService;
    private final BookingService bookingService;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;


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

    @Override
    @Transactional(readOnly = true)
    public GroupRoomAssignmentSuggestionResponse getAssignmentSuggestion(Long groupBookingId) {
        GroupBooking groupBooking = findGroupBooking(groupBookingId);
        List<Booking> unassignedBookings = bookingRepository.findUnassignedAssignableByGroupBookingId(groupBookingId);
        Map<Long, List<Room>> roomsByType = new HashMap<>();

        for (Booking booking : unassignedBookings) {
            roomsByType.computeIfAbsent(booking.getRoomType().getId(), roomTypeId ->
                    roomRepository.findAvailableWithoutConflicts(roomTypeId, RoomStatus.AVAILABLE,
                            groupBooking.getCheckInDate(), groupBooking.getCheckOutDate()));
        }

        return GroupRoomAssignmentSuggestionResponse.builder()
                .groupBookingId(groupBooking.getId())
                .checkInDate(groupBooking.getCheckInDate())
                .checkOutDate(groupBooking.getCheckOutDate())
                .assignments(unassignedBookings.stream().map(booking ->
                        GroupRoomAssignmentSuggestionResponse.AssignmentLine.builder()
                                .bookingId(booking.getId())
                                .roomTypeId(booking.getRoomType().getId())
                                .roomTypeName(booking.getRoomType().getName())
                                .availableRooms(roomsByType.get(booking.getRoomType().getId()).stream()
                                        .map(room -> GroupRoomAssignmentSuggestionResponse.RoomOption.builder()
                                                .id(room.getId())
                                                .roomNumber(room.getRoomNumber())
                                                .floor(room.getFloor())
                                                .maxCapacity(room.getRoomType() != null ? room.getRoomType().getMaxCapacity() : null)
                                                .build())
                                        .collect(Collectors.toList()))
                                .build())
                            .collect(Collectors.toList()))
                .build();
    }

    @Override
    @Transactional
    public GroupBookingResponse cancelPartialRooms(Long groupBookingId, List<Long> bookingIds, User actor) {
        GroupBooking groupBooking = findGroupBooking(groupBookingId);
        List<Booking> allBookings = bookingRepository.findByGroupBookingId(groupBookingId);

        // Đếm booking active (chưa hủy / chưa no-show)
        List<Booking> activeBookings = allBookings.stream()
            .filter(b -> b.getStatus() != BookingStatus.CANCELLED
                      && b.getStatus() != BookingStatus.NO_SHOW)
            .toList();

        // QTN-25: Nếu chọn hủy hết toàn bộ phòng active → hướng dẫn dùng luồng hủy cả đoàn
        if (new HashSet<>(bookingIds).containsAll(activeBookings.stream().map(Booking::getId).toList())) {
            throw new IllegalArgumentException(
                "Bạn đang chọn hủy toàn bộ " + activeBookings.size() + " phòng của đoàn. "
                + "Vui lòng dùng chức năng hủy cả hồ sơ đoàn thay vì hủy từng phòng.");
        }

        // Tìm các booking cần hủy — phải thuộc đoàn này và chưa nhận phòng
        Map<Long, Booking> activeMap = activeBookings.stream()
            .collect(Collectors.toMap(Booking::getId, b -> b));
        List<Booking> toCancel = new ArrayList<>();
        for (Long bookingId : bookingIds) {
            Booking b = activeMap.get(bookingId);
            if (b == null) {
                throw new ResourceNotFoundException(
                    "Booking #" + bookingId + " không thuộc đoàn này hoặc đã bị hủy");
            }
            if (b.getStatus() == BookingStatus.CHECKED_IN || b.getStatus() == BookingStatus.CHECKED_OUT) {
                throw new IllegalArgumentException(
                    "Booking #" + bookingId + " đã nhận phòng, không thể hủy từng phần");
            }
            toCancel.add(b);
        }

        // Tính phí hủy theo CancellationPolicy cho từng booking
        LocalDate today = LocalDate.now();
        StringBuilder logDetail = new StringBuilder("Hủy một phần đoàn #" + groupBookingId
            + " — Hủy " + toCancel.size() + " phòng:");

        for (Booking booking : toCancel) {
            BigDecimal fee = calculateCancellationFee(booking, groupBooking.getCheckInDate(), today);
            booking.setCancellationFee(fee);
            booking.setStatus(BookingStatus.CANCELLED);
            logDetail.append(" [Booking#").append(booking.getId())
                .append(" phòng ").append(booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "chưa gán")
                .append(" phí=").append(fee).append("]");
        }

        bookingRepository.saveAll(toCancel);

        auditLogService.log("GroupBooking", groupBookingId, "CANCEL_PARTIAL_ROOMS", actor,
            logDetail.toString());

        return toResponse(groupBooking, bookingRepository.findByGroupBookingId(groupBookingId));
    }

    @Override
    @Transactional
    public List<BookingResponse> bulkCheckOut(Long groupBookingId, User actor) {
        GroupBooking groupBooking = findGroupBooking(groupBookingId);
        List<Booking> allBookings = bookingRepository.findByGroupBookingId(groupBookingId);

        List<Booking> checkedInBookings = allBookings.stream()
            .filter(b -> b.getStatus() == BookingStatus.CHECKED_IN)
            .toList();

        if (checkedInBookings.isEmpty()) {
            throw new IllegalArgumentException(
                "Không có phòng nào đang ở trong đoàn (không có phòng nào ở trạng thái CHECKED_IN).");
        }

        List<BookingResponse> results = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        for (Booking booking : checkedInBookings) {
            try {
                results.add(bookingService.checkOut(booking.getId(), actor));
            } catch (Exception e) {
                errors.add("Phòng #" + booking.getId()
                    + (booking.getRoom() != null ? " (" + booking.getRoom().getRoomNumber() + ")" : "")
                    + ": " + e.getMessage());
            }
        }

        if (!errors.isEmpty()) {
            throw new IllegalArgumentException(
                "Không thể trả phòng một số phòng trong đoàn:\n" + String.join("\n", errors));
        }

        auditLogService.log("GroupBooking", groupBookingId, "BULK_CHECK_OUT", actor,
            "Trả phòng đoàn: " + results.size() + " phòng");
        return results;
    }

    @Override
    @Transactional(readOnly = true)
    public GroupCancelPreviewResponse previewCancelPartial(Long groupBookingId, List<Long> bookingIds) {
        GroupBooking groupBooking = findGroupBooking(groupBookingId);
        List<Booking> allBookings = bookingRepository.findByGroupBookingId(groupBookingId);
        LocalDate today = LocalDate.now();

        Map<Long, Booking> bookingMap = allBookings.stream()
                .filter(b -> b.getStatus() != BookingStatus.CANCELLED && b.getStatus() != BookingStatus.NO_SHOW)
                .collect(Collectors.toMap(Booking::getId, b -> b));

        List<GroupCancelPreviewResponse.RoomCancelPreviewItem> items = new ArrayList<>();
        BigDecimal totalFee = BigDecimal.ZERO;

        for (Long bId : bookingIds) {
            Booking b = bookingMap.get(bId);
            if (b != null) {
                BigDecimal fee = calculateCancellationFee(b, groupBooking.getCheckInDate(), today);
                BigDecimal price = b.getActualPrice() != null ? b.getActualPrice()
                        : (b.getExpectedPrice() != null ? b.getExpectedPrice() : BigDecimal.ZERO);
                items.add(GroupCancelPreviewResponse.RoomCancelPreviewItem.builder()
                        .bookingId(b.getId())
                        .roomTypeName(b.getRoomType().getName())
                        .roomNumber(b.getRoom() != null ? b.getRoom().getRoomNumber() : "Chưa gán")
                        .roomPrice(price)
                        .cancellationFee(fee)
                        .isFreeCancellation(fee.compareTo(BigDecimal.ZERO) == 0)
                        .build());
                totalFee = totalFee.add(fee);
            }
        }

        BigDecimal activeExpectedTotal = allBookings.stream()
                .filter(b -> b.getStatus() != BookingStatus.CANCELLED && b.getStatus() != BookingStatus.NO_SHOW && !bookingIds.contains(b.getId()))
                .map(b -> b.getActualPrice() != null ? b.getActualPrice() : (b.getExpectedPrice() != null ? b.getExpectedPrice() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return GroupCancelPreviewResponse.builder()
                .groupBookingId(groupBookingId)
                .cancellingRoomsCount(items.size())
                .totalCancellationFee(totalFee)
                .remainingExpectedTotal(activeExpectedTotal)
                .items(items)
                .build();
    }

    @Override
    @Transactional
    public Deposit createDeposit(Long groupBookingId, GroupDepositCreateRequest request, User actor) {
        GroupBooking groupBooking = findGroupBooking(groupBookingId);

        Deposit deposit = Deposit.builder()
                .groupBooking(groupBooking)
                .booking(null)
                .requiredAmount(request.getAmount())
                .collectedAmount(request.getAmount())
                .status(DepositStatus.COLLECTED)
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.CASH)
                .collectedBy(actor)
                .collectedAt(LocalDateTime.now())
                .note(request.getNote())
                .build();

        Deposit saved = depositRepository.save(deposit);

        // Tự động ghi nhận payment vào hóa đơn gộp đoàn nếu đã được tạo trước đó
        List<Invoice> existingInvoices = invoiceRepository.findByGroupBookingIdOrderByIdAsc(groupBookingId);
        for (Invoice invoice : existingInvoices) {
            if (invoice.getStatus() == InvoiceStatus.PENDING && invoice.getMode() == InvoiceMode.COMBINED) {
                paymentRepository.save(Payment.builder()
                        .invoice(invoice)
                        .amount(request.getAmount())
                        .method(request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.CASH)
                        .paidAt(LocalDateTime.now())
                        .collectedBy(actor)
                        .note("Trừ tiền đặt cọc đoàn vừa thu (Mã cọc #" + saved.getId() + ")")
                        .build());
                BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                        .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                if (totalPaid.compareTo(invoice.getTotalAmount()) >= 0) {
                    invoice.setStatus(InvoiceStatus.PAID);
                    invoiceRepository.save(invoice);
                }
            }
        }

        auditLogService.log("GroupBooking", groupBookingId, "COLLECT_DEPOSIT", actor,
                "Thu tiền cọc đoàn: " + request.getAmount() + " đ qua " + request.getPaymentMethod());
        return saved;
    }


    @Override
    @Transactional(readOnly = true)
    public List<Deposit> getDeposits(Long groupBookingId) {
        findGroupBooking(groupBookingId);
        return depositRepository.findByGroupBookingIdOrderByCreatedAtDesc(groupBookingId);
    }

    /**
     * Tính phí hủy theo CancellationPolicy.
     * - Nếu hủy trước freeCancelHours giờ so với checkIn: miễn phí (0)
     * - Nếu hủy muộn hơn: penaltyPercent % nhân actualPrice của booking
     */
    private BigDecimal calculateCancellationFee(Booking booking, LocalDate checkInDate, LocalDate today) {
        long hoursUntilCheckIn = ChronoUnit.HOURS.between(
            today.atStartOfDay(), checkInDate.atStartOfDay());

        // Ưu tiên chính sách theo loại phòng, sau đó dùng chính sách chung
        CancellationPolicy policy = cancellationPolicyRepository
            .findFirstByRoomTypeId(booking.getRoomType().getId())
            .orElseGet(() -> cancellationPolicyRepository.findByRoomTypeIsNull().orElse(null));

        if (policy == null || hoursUntilCheckIn >= policy.getFreeCancelHours()) {
            return BigDecimal.ZERO; // Trong hạn miễn phí
        }

        BigDecimal price = booking.getActualPrice() != null ? booking.getActualPrice()
            : (booking.getExpectedPrice() != null ? booking.getExpectedPrice() : BigDecimal.ZERO);
        return price.multiply(policy.getPenaltyPercent())
            .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
    }

    @Override
    @Transactional
    public GroupBookingResponse assignRooms(Long groupBookingId, GroupRoomAssignmentRequest request, User actor) {
        GroupBooking groupBooking = findGroupBooking(groupBookingId);
        List<Booking> allBookings = bookingRepository.findByGroupBookingId(groupBookingId);

        // Bắt buộc đoàn phải thu tiền cọc trước khi gán phòng
        List<Deposit> groupDeposits = depositRepository.findByGroupBookingIdOrderByCreatedAtDesc(groupBookingId);
        BigDecimal totalCollectedDeposit = groupDeposits.stream()
                .filter(d -> d.getStatus() == DepositStatus.COLLECTED || d.getStatus() == DepositStatus.SHORT_PAID)
                .map(d -> {
                    BigDecimal eff = d.getCollectedAmount() != null ? d.getCollectedAmount() : BigDecimal.ZERO;
                    if (d.getRefundedAmount() != null) eff = eff.subtract(d.getRefundedAmount());
                    if (d.getPenaltyAmount() != null) eff = eff.subtract(d.getPenaltyAmount());
                    return eff.max(BigDecimal.ZERO);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal requiredDeposit = calculateRequiredDepositForGroup(allBookings);

        if (totalCollectedDeposit.compareTo(BigDecimal.ZERO) <= 0 || (requiredDeposit.compareTo(BigDecimal.ZERO) > 0 && totalCollectedDeposit.compareTo(requiredDeposit) < 0)) {
            throw new IllegalArgumentException("Hồ sơ đoàn #" + groupBookingId + " chưa hoàn thành tiền đặt cọc (yêu cầu tối thiểu "
                    + requiredDeposit.toBigInteger() + " đ, đã thu " + totalCollectedDeposit.toBigInteger() + " đ). Vui lòng thu tiền đặt cọc trước khi gán phòng.");
        }

        List<Booking> unassignedBookings = bookingRepository.findUnassignedAssignableByGroupBookingId(groupBookingId);
        validateAssignmentCoverage(unassignedBookings, request.getAssignments());

        List<Long> roomIds = request.getAssignments().stream()
                .map(GroupRoomAssignmentItemRequest::getRoomId)
                .sorted()
                .collect(Collectors.toList());
        if (new HashSet<>(roomIds).size() != roomIds.size()) {
            throw new IllegalArgumentException("Một phòng không thể được gán cho nhiều booking trong cùng đoàn");
        }

        Map<Long, Room> lockedRooms = roomRepository.findByIdsForUpdate(roomIds).stream()
                .collect(Collectors.toMap(Room::getId, room -> room));
        if (lockedRooms.size() != roomIds.size()) {
            throw new ResourceNotFoundException("Có phòng không tồn tại hoặc không thể khóa để gán");
        }

        Map<Long, Booking> bookingsById = unassignedBookings.stream()
                .collect(Collectors.toMap(Booking::getId, booking -> booking));
        for (GroupRoomAssignmentItemRequest assignment : request.getAssignments()) {
            Booking booking = bookingsById.get(assignment.getBookingId());
            Room room = lockedRooms.get(assignment.getRoomId());
            validateRoomAssignment(booking, room, groupBooking);
            booking.setRoom(room);
            booking.setStatus(BookingStatus.CONFIRMED);
        }

        List<Booking> savedBookings = bookingRepository.saveAll(unassignedBookings);
        auditLogService.log("GroupBooking", groupBooking.getId(), "ASSIGN_ROOMS", actor,
                "Gán đồng loạt " + savedBookings.size() + " phòng cho đoàn " + groupBooking.getRepresentativeGuest().getName());
        return toResponse(groupBooking, bookingRepository.findByGroupBookingId(groupBookingId));
    }

    private GroupBooking findGroupBooking(Long groupBookingId) {
        return groupBookingRepository.findById(groupBookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ đặt phòng đoàn"));
    }

    private void validateAssignmentCoverage(List<Booking> unassignedBookings,
                                            List<GroupRoomAssignmentItemRequest> assignments) {
        if (unassignedBookings.isEmpty()) {
            throw new IllegalArgumentException("Đoàn không còn booking nào cần gán phòng");
        }
        if (assignments == null || assignments.size() != unassignedBookings.size()) {
            throw new IllegalArgumentException("Cần gán phòng cho tất cả booking chưa được gán của đoàn");
        }
        Set<Long> bookingIds = assignments.stream()
                .map(GroupRoomAssignmentItemRequest::getBookingId)
                .collect(Collectors.toSet());
        Set<Long> expectedBookingIds = unassignedBookings.stream()
                .map(Booking::getId)
                .collect(Collectors.toSet());
        if (bookingIds.size() != assignments.size() || !bookingIds.equals(expectedBookingIds)) {
            throw new IllegalArgumentException("Danh sách booking cần gán không khớp với các booking chưa gán của đoàn");
        }
    }

    private void validateRoomAssignment(Booking booking, Room room, GroupBooking groupBooking) {
        if (room.getStatus() != RoomStatus.AVAILABLE) {
            throw new IllegalArgumentException("Phòng " + room.getRoomNumber() + " hiện không ở trạng thái sẵn sàng");
        }
        if (!room.getRoomType().getId().equals(booking.getRoomType().getId())) {
            throw new IllegalArgumentException("Phòng " + room.getRoomNumber() + " không đúng loại phòng "
                    + booking.getRoomType().getName());
        }
        List<Booking> conflicts = bookingRepository.findConflictingBookings(room.getId(),
                groupBooking.getCheckInDate(), groupBooking.getCheckOutDate(), booking.getId());
        if (!conflicts.isEmpty()) {
            throw new IllegalArgumentException("Phòng " + room.getRoomNumber() + " đã được đặt trong thời gian lưu trú");
        }
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
                Guest guest = existing.get();
                boolean updated = false;
                if (request.getRepresentativeEmail() != null && !request.getRepresentativeEmail().isBlank() && !request.getRepresentativeEmail().trim().equals(guest.getEmail())) {
                    guest.setEmail(request.getRepresentativeEmail().trim());
                    updated = true;
                }
                if (request.getRepresentativeName() != null && !request.getRepresentativeName().isBlank() && !request.getRepresentativeName().equals(guest.getName())) {
                    guest.setName(request.getRepresentativeName().trim());
                    updated = true;
                }
                if (request.getRepresentativeIdNumber() != null && !request.getRepresentativeIdNumber().isBlank() && !request.getRepresentativeIdNumber().trim().equals(guest.getIdNumber())) {
                    guest.setIdNumber(request.getRepresentativeIdNumber().trim());
                    updated = true;
                }
                if (updated) {
                    guest = guestRepository.save(guest);
                }
                return guest;
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

        List<Deposit> groupDeposits = depositRepository.findByGroupBookingIdOrderByCreatedAtDesc(group.getId());
        Set<Long> countedDepositIds = new HashSet<>();
        BigDecimal totalDeposited = BigDecimal.ZERO;
        List<Deposit> allDeposits = new ArrayList<>(groupDeposits);
        for (Booking b : bookings) {
            allDeposits.addAll(depositRepository.findByBookingIdOrderByCreatedAtDesc(b.getId()));
        }
        for (Deposit d : allDeposits) {
            if (d.getId() != null && countedDepositIds.add(d.getId())) {
                if (d.getStatus() == DepositStatus.COLLECTED || d.getStatus() == DepositStatus.SHORT_PAID) {
                    BigDecimal eff = d.getCollectedAmount() != null ? d.getCollectedAmount() : BigDecimal.ZERO;
                    if (d.getRefundedAmount() != null) eff = eff.subtract(d.getRefundedAmount());
                    if (d.getPenaltyAmount() != null) eff = eff.subtract(d.getPenaltyAmount());
                    if (eff.compareTo(BigDecimal.ZERO) > 0) {
                        totalDeposited = totalDeposited.add(eff);
                    }
                }
            }
        }
        boolean depositPaid = totalDeposited.compareTo(BigDecimal.ZERO) > 0;

        List<Invoice> groupInvoices = invoiceRepository.findByGroupBookingIdOrderByIdAsc(group.getId()).stream()
                .filter(inv -> inv.getStatus() != InvoiceStatus.ADJUSTED)
                .collect(Collectors.toList());

        boolean hasInvoice = !groupInvoices.isEmpty();
        String invoiceStatus = "NO_INVOICE";
        BigDecimal invoiceTotalAmount = BigDecimal.ZERO;
        BigDecimal invoicePaidAmount = BigDecimal.ZERO;
        BigDecimal invoiceOutstandingAmount = BigDecimal.ZERO;

        if (hasInvoice) {
            invoiceTotalAmount = groupInvoices.stream()
                    .map(inv -> inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            invoicePaidAmount = groupInvoices.stream()
                    .flatMap(inv -> paymentRepository.findByInvoiceId(inv.getId()).stream())
                    .map(Payment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            invoiceOutstandingAmount = invoiceTotalAmount.subtract(invoicePaidAmount).max(BigDecimal.ZERO);

            boolean allPaid = groupInvoices.stream().allMatch(inv -> inv.getStatus() == InvoiceStatus.PAID)
                    || (invoiceTotalAmount.compareTo(BigDecimal.ZERO) > 0 && invoiceOutstandingAmount.compareTo(BigDecimal.ZERO) <= 0);

            if (allPaid) {
                invoiceStatus = "PAID";
            } else if (invoicePaidAmount.compareTo(BigDecimal.ZERO) > 0) {
                invoiceStatus = "PARTIALLY_PAID";
            } else {
                invoiceStatus = "UNPAID";
            }
        }

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
                .depositPaid(depositPaid)
                .depositAmount(totalDeposited)
                .requiredDepositAmount(calculateRequiredDepositForGroup(bookings))
                .hasInvoice(hasInvoice)
                .invoiceStatus(invoiceStatus)
                .invoiceTotalAmount(invoiceTotalAmount)
                .invoicePaidAmount(invoicePaidAmount)
                .invoiceOutstandingAmount(invoiceOutstandingAmount)
                .bookings(bookings.stream().map(this::toBookingResponse).collect(Collectors.toList()))
                .createdAt(group.getCreatedAt())
                .build();
    }

    /**
     * Logic tính tiền đặt cọc theo đoàn:
     * Dựa trên chính sách cọc của từng hạng phòng trong đoàn.
     * Nếu hạng phòng có chính sách riêng -> áp dụng % cọc của hạng đó.
     * Nếu không có chính sách riêng -> áp dụng % cọc của chính sách mặc định chung.
     * Nếu chưa có chính sách -> thu mặc định 20% tiền phòng của hạng đó.
     */
    private BigDecimal calculateRequiredDepositForGroup(List<Booking> bookings) {
        BigDecimal totalRequired = BigDecimal.ZERO;
        Map<Long, BigDecimal> percentByRoomType = new HashMap<>();
        BigDecimal defaultPercent = null;

        for (Booking booking : bookings) {
            if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.NO_SHOW) {
                continue;
            }

            BigDecimal roomPrice = booking.getActualPrice() != null
                    ? booking.getActualPrice()
                    : (booking.getExpectedPrice() != null ? booking.getExpectedPrice() : BigDecimal.ZERO);

            if (roomPrice.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            Long roomTypeId = booking.getRoomType() != null ? booking.getRoomType().getId() : null;
            BigDecimal percent = null;

            if (roomTypeId != null) {
                if (percentByRoomType.containsKey(roomTypeId)) {
                    percent = percentByRoomType.get(roomTypeId);
                } else {
                    Optional<DepositPolicy> policyOpt = depositPolicyRepository.findFirstByRoomTypeIdAndActiveTrue(roomTypeId);
                    if (policyOpt.isPresent()) {
                        percent = policyOpt.get().getDepositPercent();
                    }
                    percentByRoomType.put(roomTypeId, percent);
                }
            }

            if (percent == null) {
                if (defaultPercent == null) {
                    Optional<DepositPolicy> defaultPolicyOpt = depositPolicyRepository.findFirstByRoomTypeIsNullAndActiveTrue();
                    defaultPercent = defaultPolicyOpt.map(DepositPolicy::getDepositPercent)
                            .orElse(BigDecimal.valueOf(20)); // Thu mặc định 20% nếu không có chính sách
                }
                percent = defaultPercent;
            }

            BigDecimal roomDeposit = roomPrice.multiply(percent)
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            totalRequired = totalRequired.add(roomDeposit);
        }

        return totalRequired;
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
                .roomCapacity(booking.getRoomType() != null ? booking.getRoomType().getMaxCapacity() : null)
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