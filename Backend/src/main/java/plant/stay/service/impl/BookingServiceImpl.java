package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.BookingRequest;
import plant.stay.dto.request.ExtendStayRequest;
import plant.stay.dto.request.UpgradeRoomRequest;
import plant.stay.dto.response.BookingResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.BookingService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final GuestRepository guestRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
    private final SeasonalPriceRepository seasonalPriceRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final DepositRepository depositRepository;
    private final BookingServiceUsageRepository bookingServiceUsageRepository;
    private final StayDeclarationRepository stayDeclarationRepository;
    private final AuditLogService auditLogService;
    private final CancellationPolicyRepository cancellationPolicyRepository;

    @Override
    public List<BookingResponse> getAll() {
        return bookingRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt", "id"))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public BookingResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Override
    public List<?> getCalendar(LocalDate from, LocalDate to) {
        // Trả về danh sách booking cho lịch phòng
        return bookingRepository.findForCalendar(from, to).stream()
                .map(b -> Map.of(
                        "bookingId", b.getId(),
                        "roomId", b.getRoom() != null ? b.getRoom().getId() : "",
                        "roomNumber", b.getRoom() != null ? b.getRoom().getRoomNumber() : "Chưa gán",
                        "guestName", b.getGuest().getName(),
                        "checkInDate", b.getCheckInDate().toString(),
                        "checkOutDate", b.getCheckOutDate().toString(),
                        "status", b.getStatus().name()
                ))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BookingResponse create(BookingRequest request, User actor) {
        if (!request.getCheckOutDate().isAfter(request.getCheckInDate())) {
            throw new IllegalArgumentException("Ngày trả phòng phải sau ngày nhận phòng");
        }

        Guest guest = guestRepository.findById(request.getGuestId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng"));
        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));

        Room room = null;
        if (request.getRoomId() != null) {
            room = roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng"));
            checkRoomConflict(room.getId(), request.getCheckInDate(), request.getCheckOutDate(), -1L);
        }

        BigDecimal expectedPrice = calculatePrice(roomType, request.getCheckInDate(), request.getCheckOutDate());

        Booking booking = Booking.builder()
                .guest(guest)
                .roomType(roomType)
                .room(room)
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .status(BookingStatus.NEW)
                .expectedPrice(expectedPrice)
                .actualPrice(expectedPrice)
                .note(request.getNote())
                .createdBy(actor)
                .build();
        booking = bookingRepository.save(booking);
        auditLogService.log("Booking", booking.getId(), "CREATE", actor,
                "Tạo đặt phòng cho khách " + guest.getName());
        return toResponse(booking);
    }

    @Override
    @Transactional
    public BookingResponse assignRoom(Long bookingId, Long roomId, User actor) {
        Booking booking = findById(bookingId);
        if (booking.getStatus() != BookingStatus.NEW && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException("Chỉ có thể gán phòng cho đặt phòng ở trạng thái NEW hoặc CONFIRMED");
        }
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng"));

        // Kiểm tra chống trùng phòng với pessimistic lock (QTN-01)
        checkRoomConflict(roomId, booking.getCheckInDate(), booking.getCheckOutDate(), bookingId);

        booking.setRoom(room);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking = bookingRepository.save(booking);
        auditLogService.log("Booking", booking.getId(), "ASSIGN_ROOM", actor,
                "Gán phòng " + room.getRoomNumber());
        return toResponse(booking);
    }

    @Override
    @Transactional
    public BookingResponse cancel(Long bookingId, User actor) {
        Booking booking = findById(bookingId);
        if (booking.getStatus() == BookingStatus.CHECKED_IN || booking.getStatus() == BookingStatus.CHECKED_OUT) {
            throw new IllegalArgumentException("Không thể hủy đặt phòng đã nhận/trả phòng");
        }
        String oldStatus = booking.getStatus().name();
        booking.setStatus(BookingStatus.CANCELLED);

        // === Áp dụng chính sách hủy (QTN-06) ===
        String cancelNote = "Hủy từ trạng thái " + oldStatus;
        try {
            // Tìm chính sách theo loại phòng, fallback về chính sách chung (roomType = null)
            CancellationPolicy policy = null;
            if (booking.getRoomType() != null) {
                policy = cancellationPolicyRepository
                        .findFirstByRoomTypeId(booking.getRoomType().getId())
                        .orElse(null);
            }
            if (policy == null) {
                policy = cancellationPolicyRepository
                        .findByRoomTypeIsNull()
                        .orElse(null);
            }
            if (policy != null && booking.getExpectedPrice() != null) {
                long hoursUntilCheckIn = ChronoUnit.HOURS.between(
                        LocalDateTime.now(),
                        booking.getCheckInDate().atTime(14, 0) // giờ nhận phòng mặc định 14:00
                );
                if (hoursUntilCheckIn < policy.getFreeCancelHours()) {
                    BigDecimal penalty = booking.getExpectedPrice()
                            .multiply(policy.getPenaltyPercent())
                            .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
                    cancelNote += String.format(" | Phí hủy: %s%% = %,.0fđ",
                            policy.getPenaltyPercent().stripTrailingZeros().toPlainString(),
                            penalty.doubleValue());
                    booking.setCancellationFee(penalty);
                }
            }
        } catch (Exception ignored) { /* Không để lỗi chặn hủy */ }

        // Trả phòng về AVAILABLE nếu đã gán
        if (booking.getRoom() != null) {
            Room room = booking.getRoom();
            if (room.getStatus() == RoomStatus.OCCUPIED) {
                room.setStatus(RoomStatus.AVAILABLE);
                roomRepository.save(room);
            }
        }
        bookingRepository.save(booking);
        auditLogService.log("Booking", booking.getId(), "CANCEL", actor, cancelNote);
        return toResponse(booking);
    }

    @Override
    @Transactional
    public BookingResponse changeRoom(Long bookingId, Long newRoomId, User actor) {
        Booking booking = findById(bookingId);
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể đổi phòng khi trạng thái là CONFIRMED hoặc CHECKED_IN");
        }
        Room newRoom = roomRepository.findById(newRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng mới"));

        // Kiểm tra bắt buộc cùng loại phòng
        if (!newRoom.getRoomType().getId().equals(booking.getRoomType().getId())) {
            throw new IllegalArgumentException("Chỉ được đổi sang phòng cùng loại (" + booking.getRoomType().getName() + "). Để đổi khác loại phòng, vui lòng sử dụng tính năng Nâng hạng phòng.");
        }

        // Kiểm tra không được chọn lại chính phòng hiện tại
        if (booking.getRoom() != null && booking.getRoom().getId().equals(newRoomId)) {
            throw new IllegalArgumentException("Phòng mới được chọn trùng với phòng hiện tại!");
        }

        // Kiểm tra chống trùng cho phòng mới (QTN-08)
        checkRoomConflict(newRoomId, booking.getCheckInDate(), booking.getCheckOutDate(), bookingId);

        // Nếu đang CHECKED_IN, trả phòng cũ về DIRTY
        if (booking.getStatus() == BookingStatus.CHECKED_IN && booking.getRoom() != null) {
            Room oldRoom = booking.getRoom();
            oldRoom.setStatus(RoomStatus.DIRTY);
            roomRepository.save(oldRoom);
            newRoom.setStatus(RoomStatus.OCCUPIED);
            roomRepository.save(newRoom);
        }

        String oldRoomNumber = booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "Chưa gán";
        booking.setRoom(newRoom);
        bookingRepository.save(booking);
        auditLogService.log("Booking", booking.getId(), "CHANGE_ROOM", actor,
                "Đổi từ phòng " + oldRoomNumber + " sang " + newRoom.getRoomNumber() + " (Cùng loại: " + newRoom.getRoomType().getName() + ")");
        return toResponse(booking);
    }

    @Override
    @Transactional
    public BookingResponse noShow(Long bookingId, User actor) {
        Booking booking = findById(bookingId);
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException("Chỉ có thể đánh dấu no-show khi đặt phòng ở trạng thái CONFIRMED");
        }
        booking.setStatus(BookingStatus.NO_SHOW);
        bookingRepository.save(booking);
        auditLogService.log("Booking", booking.getId(), "NO_SHOW", actor, "Đánh dấu khách không đến");
        return toResponse(booking);
    }

    @Override
    @Transactional
    public BookingResponse checkIn(Long bookingId, User actor) {
        return checkIn(bookingId, (plant.stay.dto.request.CheckInRequest) null, actor);
    }

    @Override
    @Transactional
    public BookingResponse checkIn(Long bookingId, plant.stay.dto.request.CheckInRequest req, User actor) {
        Booking booking = findById(bookingId);
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException("Chỉ có thể nhận phòng khi đặt phòng ở trạng thái CONFIRMED");
        }
        if (booking.getRoom() == null) {
            throw new IllegalArgumentException("Phải gán phòng trước khi nhận phòng");
        }

        List<Guest> stayingGuests = new java.util.ArrayList<>();
        if (req != null && req.getGuests() != null) {
            for (plant.stay.dto.request.GuestCheckInDto dto : req.getGuests()) {
                Guest guest = null;

                if (dto.getName() != null && booking.getGuest().getName() != null && 
                    dto.getName().trim().equalsIgnoreCase(booking.getGuest().getName().trim())) {
                    guest = booking.getGuest();
                }

                if (guest == null && dto.getIdNumber() != null && !dto.getIdNumber().trim().isEmpty()) {
                    guest = guestRepository.findFirstByIdNumberOrderByIdDesc(dto.getIdNumber().trim()).orElse(null);
                }
                
                if (guest == null) {
                    guest = Guest.builder()
                            .name(dto.getName())
                            .idNumber(dto.getIdNumber() != null ? dto.getIdNumber().trim() : null)
                            .build();
                    guest = guestRepository.save(guest);
                } else {
                    boolean updated = false;
                    if (dto.getName() != null && !dto.getName().trim().isEmpty() && !dto.getName().equals(guest.getName())) {
                        guest.setName(dto.getName().trim());
                        updated = true;
                    }
                    if (dto.getIdNumber() != null && !dto.getIdNumber().trim().isEmpty() && !dto.getIdNumber().trim().equals(guest.getIdNumber())) {
                        guest.setIdNumber(dto.getIdNumber().trim());
                        updated = true;
                    }
                    if (updated) {
                        guest = guestRepository.save(guest);
                    }
                }
                stayingGuests.add(guest);
            }
        }
        booking.setStayingGuests(stayingGuests);

        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckedInAt(LocalDateTime.now());
        booking.getRoom().setStatus(RoomStatus.OCCUPIED);
        roomRepository.save(booking.getRoom());
        bookingRepository.save(booking);
        StayDeclaration declaration = stayDeclarationRepository.save(StayDeclaration.builder()
            .booking(booking)
            .status(StayDeclarationStatus.PENDING)
            .build());
        booking.setStayDeclaration(declaration);
        auditLogService.log("Booking", booking.getId(), "CHECK_IN", actor,
                "Nhận phòng " + booking.getRoom().getRoomNumber() + 
            (req != null && req.getGuests() != null && !req.getGuests().isEmpty() ? " (" + req.getGuests().size() + " khách lưu trú)" : ""));
        return toResponse(booking);
    }

    @Override
    @Transactional
    public List<BookingResponse> bulkCheckIn(plant.stay.dto.request.BulkCheckInRequest req, User actor) {
        List<BookingResponse> responses = new java.util.ArrayList<>();
        for (plant.stay.dto.request.BulkCheckInRoomRequest roomReq : req.getRooms()) {
            plant.stay.dto.request.CheckInRequest checkInReq = new plant.stay.dto.request.CheckInRequest();
            checkInReq.setGuests(roomReq.getGuests());
            responses.add(checkIn(roomReq.getBookingId(), checkInReq, actor));
        }
        return responses;
    }

    @Override
    @Transactional
    public BookingResponse checkOut(Long bookingId, User actor) {
        Booking booking = findById(bookingId);
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể trả phòng khi đặt phòng ở trạng thái CHECKED_IN");
        }
        
        // Bắt buộc phải thanh toán hóa đơn xong mới được trả phòng
        Invoice invoice = invoiceRepository.findInvoicesCoveringBooking(bookingId).stream().findFirst().orElse(null);
        if (invoice != null && invoice.getStatus() == InvoiceStatus.PENDING) {
            BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                    .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            boolean hasDepositPayment = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                    .anyMatch(p -> p.getNote() != null && (p.getNote().contains("đặt cọc") || p.getNote().contains("cọc") || p.getNote().contains("Deposit")));

            if (!hasDepositPayment) {
                List<Deposit> deposits = depositRepository.findByBookingIdOrderByCreatedAtDesc(bookingId);
                for (Deposit d : deposits) {
                    if (d.getStatus() == DepositStatus.COLLECTED || d.getStatus() == DepositStatus.SHORT_PAID) {
                        BigDecimal effectiveDeposit = d.getCollectedAmount() != null ? d.getCollectedAmount() : BigDecimal.ZERO;
                        if (d.getRefundedAmount() != null) effectiveDeposit = effectiveDeposit.subtract(d.getRefundedAmount());
                        if (d.getPenaltyAmount() != null) effectiveDeposit = effectiveDeposit.subtract(d.getPenaltyAmount());
                        if (effectiveDeposit.compareTo(BigDecimal.ZERO) > 0) {
                            Payment depositPayment = Payment.builder()
                                    .invoice(invoice)
                                    .amount(effectiveDeposit)
                                    .method(d.getPaymentMethod() != null ? d.getPaymentMethod() : PaymentMethod.CASH)
                                    .paidAt(d.getCollectedAt() != null ? d.getCollectedAt() : LocalDateTime.now())
                                    .collectedBy(d.getCollectedBy() != null ? d.getCollectedBy() : actor)
                                    .note("Trừ tiền đặt cọc đã thu (Mã cọc #" + d.getId() + ")")
                                    .build();
                            paymentRepository.save(depositPayment);
                            totalPaid = totalPaid.add(effectiveDeposit);
                        }
                    }
                }
            }

            if (totalPaid.compareTo(invoice.getTotalAmount()) >= 0) {
                invoice.setStatus(InvoiceStatus.PAID);
                invoiceRepository.save(invoice);
            }
        }

        if (invoice == null || invoice.getStatus() != InvoiceStatus.PAID) {
            throw new IllegalArgumentException("Phải lập hóa đơn và thanh toán đầy đủ trước khi trả phòng!");
        }

        booking.setStatus(BookingStatus.CHECKED_OUT);
        if (invoice != null && invoice.getMode() == InvoiceMode.COMBINED) {
            BigDecimal serviceAmount = bookingServiceUsageRepository.findByBookingId(bookingId).stream()
                    .map(usage -> usage.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(usage.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal roomAmount = booking.getActualPrice() != null ? booking.getActualPrice()
                    : (booking.getExpectedPrice() != null ? booking.getExpectedPrice() : BigDecimal.ZERO);
            booking.setActualPrice(roomAmount.add(serviceAmount));
        } else if (invoice != null && invoice.getTotalAmount() != null) {
            booking.setActualPrice(invoice.getTotalAmount());
        } else if (booking.getExpectedPrice() != null) {
            booking.setActualPrice(booking.getExpectedPrice());
        }

        // Phòng chuyển sang DIRTY sau khi trả (QTN-05)
        if (booking.getRoom() != null) {
            booking.getRoom().setStatus(RoomStatus.DIRTY);
            roomRepository.save(booking.getRoom());
        }
        // Tích điểm loyalty: mỗi 100k = 1 điểm
        if (booking.getActualPrice() != null) {
            Guest guest = booking.getGuest();
            int points = booking.getActualPrice().divide(BigDecimal.valueOf(100000)).intValue();
            guest.setLoyaltyPoints(guest.getLoyaltyPoints() + points);
            guestRepository.save(guest);
        }
        bookingRepository.save(booking);
        auditLogService.log("Booking", booking.getId(), "CHECK_OUT", actor, "Trả phòng");
        return toResponse(booking);
    }

    // ===== NCL-04-CN-007: Gia hạn thêm đêm giữa kỳ lưu trú (QTN-22) =====
    @Override
    @Transactional
    public BookingResponse extendStay(Long bookingId, ExtendStayRequest req, User actor) {
        Booking booking = findById(bookingId);
        // Chỉ gia hạn khi đang CHECKED_IN
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể gia hạn khi khách đang lưu trú (CHECKED_IN)");
        }
        if (booking.getRoom() == null) {
            throw new IllegalArgumentException("Bắt phòng chưa được gán phòng");
        }

        LocalDate newCheckOut = booking.getCheckOutDate().plusDays(req.getAdditionalNights());

        // Kiểm tra phòng còn trống các đêm nối tiếp (QTN-22)
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                booking.getRoom().getId(),
                booking.getCheckOutDate(), // Từ ngày trả phòng hiện tại
                newCheckOut,
                bookingId
        );
        if (!conflicts.isEmpty()) {
            throw new IllegalArgumentException(
                "Phòng đã có khách khác đặt từ ngày " + conflicts.get(0).getCheckInDate() +
                ". Không thể gia hạn đến " + newCheckOut + "."
            );
        }

        // Tính tiền phòng bổ sung theo giá từng đêm (có thể khác mùa) — NCL-04-CN-007-TC-04
        BigDecimal additionalCost = calculatePrice(booking.getRoomType(),
                booking.getCheckOutDate(), newCheckOut);

        booking.setCheckOutDate(newCheckOut);
        booking.setExpectedPrice(booking.getExpectedPrice().add(additionalCost));
        booking.setActualPrice(booking.getExpectedPrice());
        if (req.getNote() != null && !req.getNote().isBlank()) {
            booking.setNote((booking.getNote() != null ? booking.getNote() + "\n" : "") +
                    "[Gia hạn " + req.getAdditionalNights() + " đêm đến " + newCheckOut + "]: " + req.getNote());
        }
        booking = bookingRepository.save(booking);

        // Cập nhật hóa đơn PENDING nếu có
        Invoice pendingInvoice = invoiceRepository.findByBookingId(bookingId).orElse(null);
        if (pendingInvoice != null && pendingInvoice.getStatus() == InvoiceStatus.PENDING) {
            pendingInvoice.setRoomAmount(booking.getActualPrice());
            BigDecimal serviceAmt = pendingInvoice.getServiceAmount() != null ? pendingInvoice.getServiceAmount() : BigDecimal.ZERO;
            BigDecimal discountAmt = pendingInvoice.getDiscountAmount() != null ? pendingInvoice.getDiscountAmount() : BigDecimal.ZERO;
            pendingInvoice.setTotalAmount(booking.getActualPrice().add(serviceAmt).subtract(discountAmt));
            invoiceRepository.save(pendingInvoice);
        }

        auditLogService.log("Booking", booking.getId(), "EXTEND_STAY", actor,
                "Gia hạn " + req.getAdditionalNights() + " đêm đến " + newCheckOut +
                ", tiền thêm: " + additionalCost + "đ");
        return toResponse(booking);
    }

    // ===== NCL-04-CN-007: Kiểm tra khả dụng gia hạn =====
    @Override
    public Map<String, Object> checkExtendAvailability(Long bookingId, int nights) {
        Booking booking = findById(bookingId);
        Map<String, Object> result = new java.util.HashMap<>();
        if (booking.getRoom() == null) {
            result.put("available", false);
            result.put("reason", "Phòng chưa được gán");
            return result;
        }
        if (nights <= 0) {
            nights = 1;
        }
        LocalDate newCheckOut = booking.getCheckOutDate().plusDays(nights);
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                booking.getRoom().getId(), booking.getCheckOutDate(), newCheckOut, bookingId);

        // Tính giá từng đêm trong kỳ gia hạn
        List<Map<String, Object>> nightPrices = new java.util.ArrayList<>();
        for (int i = 0; i < nights; i++) {
            LocalDate night = booking.getCheckOutDate().plusDays(i);
            List<?> seasonal = seasonalPriceRepository.findByRoomTypeAndDate(booking.getRoomType().getId(), night);
            BigDecimal price = !seasonal.isEmpty()
                    ? ((plant.stay.model.SeasonalPrice) seasonal.get(0)).getPricePerNight()
                    : (booking.getRoomType().getBasePrice() != null ? booking.getRoomType().getBasePrice() : BigDecimal.ZERO);
            Map<String, Object> np = new java.util.HashMap<>();
            np.put("date", night.toString());
            np.put("price", price);
            nightPrices.add(np);
        }
        BigDecimal totalAdditional = calculatePrice(booking.getRoomType(), booking.getCheckOutDate(), newCheckOut);

        result.put("available", conflicts.isEmpty());
        result.put("conflictDate", conflicts.isEmpty() ? null : conflicts.get(0).getCheckInDate().toString());
        result.put("newCheckOutDate", newCheckOut.toString());
        result.put("nightPrices", nightPrices);
        result.put("totalAdditionalCost", totalAdditional != null ? totalAdditional : BigDecimal.ZERO);
        return result;
    }

    // ===== NCL-04-CN-008: Nâng hạng phòng giữa kỳ lưu trú (QTN-22) =====
    @Override
    @Transactional
    public BookingResponse upgradeRoom(Long bookingId, UpgradeRoomRequest req, User actor) {
        Booking booking = findById(bookingId);
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể nâng/hạ hạng khi khách đang lưu trú (CHECKED_IN)");
        }

        RoomType newRoomType;
        Room newRoom = null;

        if (req.getNewRoomTypeId() != null) {
            newRoomType = roomTypeRepository.findById(req.getNewRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng mới"));
        } else if (req.getNewRoomId() != null) {
            newRoom = roomRepository.findById(req.getNewRoomId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng"));
            newRoomType = newRoom.getRoomType();
        } else {
            throw new IllegalArgumentException("Vui lòng chọn loại phòng mới để nâng hạng");
        }

        if (newRoomType.getId().equals(booking.getRoomType().getId())) {
            throw new IllegalArgumentException("Loại phòng mới trùng với loại phòng hiện tại! Để đổi phòng cùng loại, vui lòng sử dụng tính năng Đổi phòng.");
        }

        LocalDate today = LocalDate.now();
        LocalDate checkOut = booking.getCheckOutDate();
        if (!today.isBefore(checkOut)) {
            today = checkOut.minusDays(1);
        }

        // Tự động tìm phòng trống khả dụng thuộc loại phòng mới nếu chưa chỉ định phòng cụ thể
        if (newRoom == null) {
            List<Room> candidateRooms = roomRepository.findByRoomTypeId(newRoomType.getId());
            for (Room candidate : candidateRooms) {
                if (candidate.getStatus() == RoomStatus.AVAILABLE || candidate.getId().equals(booking.getRoom() != null ? booking.getRoom().getId() : null)) {
                    List<Booking> conflicts = bookingRepository.findConflictingBookings(
                            candidate.getId(), today, checkOut, bookingId);
                    if (conflicts.isEmpty()) {
                        newRoom = candidate;
                        break;
                    }
                }
            }
            if (newRoom == null) {
                throw new IllegalArgumentException("Không còn phòng trống nào thuộc loại " + newRoomType.getName() + " trong khoảng thời gian còn lại (đến " + checkOut + ").");
            }
        } else {
            List<Booking> conflicts = bookingRepository.findConflictingBookings(
                    newRoom.getId(), today, checkOut, bookingId);
            if (!conflicts.isEmpty()) {
                throw new IllegalArgumentException("Phòng " + newRoom.getRoomNumber() + " không trống trọn phần thời gian còn lại (đến " + checkOut + ").");
            }
        }

        // Tính chênh lệch giá cho các đêm còn lại
        BigDecimal oldPrice = calculatePrice(booking.getRoomType(), today, checkOut);
        BigDecimal newPrice = calculatePrice(newRoomType, today, checkOut);
        BigDecimal priceDiff = newPrice.subtract(oldPrice); // Dương = nâng hạng, âm = hạ hạng

        // Hạ hạng bắt buộc nhập lý do (NCL-04-CN-008-TC-03)
        if (priceDiff.compareTo(BigDecimal.ZERO) < 0 && (req.getReason() == null || req.getReason().isBlank())) {
            throw new IllegalArgumentException("Vui lòng nhập lý do khi chuyển xuống hạng phòng thấp hơn");
        }

        String oldRoomNumber = booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "Chưa gán";

        // Chuyển phòng cũ sang DIRTY nếu khác phòng mới
        if (booking.getRoom() != null && !booking.getRoom().getId().equals(newRoom.getId())) {
            Room oldRoom = booking.getRoom();
            oldRoom.setStatus(RoomStatus.DIRTY);
            roomRepository.save(oldRoom);
        }

        // Phòng mới chuyển sang OCCUPIED
        newRoom.setStatus(RoomStatus.OCCUPIED);
        roomRepository.save(newRoom);

        // Cập nhật booking
        booking.setRoom(newRoom);
        booking.setRoomType(newRoomType);
        if (booking.getExpectedPrice() != null) {
            booking.setExpectedPrice(booking.getExpectedPrice().add(priceDiff));
            booking.setActualPrice(booking.getExpectedPrice());
        }
        if (req.getReason() != null && !req.getReason().isBlank()) {
            booking.setNote((booking.getNote() != null ? booking.getNote() + "\n" : "") +
                    "[Nâng/hạ hạng sang " + newRoomType.getName() + "]: " + req.getReason());
        }
        booking = bookingRepository.save(booking);

        // Cập nhật hóa đơn PENDING nếu có
        Invoice pendingInvoice = invoiceRepository.findByBookingId(bookingId).orElse(null);
        if (pendingInvoice != null && pendingInvoice.getStatus() == InvoiceStatus.PENDING) {
            pendingInvoice.setRoomAmount(booking.getActualPrice());
            BigDecimal serviceAmt = pendingInvoice.getServiceAmount() != null ? pendingInvoice.getServiceAmount() : BigDecimal.ZERO;
            BigDecimal discountAmt = pendingInvoice.getDiscountAmount() != null ? pendingInvoice.getDiscountAmount() : BigDecimal.ZERO;
            pendingInvoice.setTotalAmount(booking.getActualPrice().add(serviceAmt).subtract(discountAmt));
            invoiceRepository.save(pendingInvoice);
        }

        String upgradeType = priceDiff.compareTo(BigDecimal.ZERO) >= 0 ? "Nâng hạng" : "Hạ hạng";
        auditLogService.log("Booking", booking.getId(), "UPGRADE_ROOM", actor,
                upgradeType + " từ phòng " + oldRoomNumber + " sang " + newRoom.getRoomNumber() +
                " (Loại: " + newRoomType.getName() + "), chênh lệch: " + priceDiff + "đ");
        return toResponse(booking);
    }

    // Kiểm tra chống trùng phòng — gọi query có pessimistic lock (QTN-01)
    private void checkRoomConflict(Long roomId, LocalDate checkIn, LocalDate checkOut, Long excludeBookingId) {
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                roomId, checkIn, checkOut, excludeBookingId);
        if (!conflicts.isEmpty()) {
            throw new IllegalArgumentException("Phòng đã được đặt trong khoảng thời gian này (xung đột với booking #"
                    + conflicts.get(0).getId() + ")");
        }
    }

    // Tính giá dự kiến: ưu tiên giá theo mùa, fallback về giá cơ bản
    private BigDecimal calculatePrice(RoomType roomType, LocalDate checkIn, LocalDate checkOut) {
        if (roomType == null || checkIn == null || checkOut == null) {
            return BigDecimal.ZERO;
        }
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights <= 0) {
            nights = 1;
        }
        BigDecimal total = BigDecimal.ZERO;
        for (long i = 0; i < nights; i++) {
            LocalDate night = checkIn.plusDays(i);
            List<?> seasonal = seasonalPriceRepository.findByRoomTypeAndDate(roomType.getId(), night);
            if (!seasonal.isEmpty()) {
                total = total.add(((plant.stay.model.SeasonalPrice) seasonal.get(0)).getPricePerNight());
            } else if (roomType.getBasePrice() != null) {
                total = total.add(roomType.getBasePrice());
            }
        }
        return total;
    }

    private Booking findById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt phòng với id: " + id));
    }

    public BookingResponse toResponse(Booking b) {
        return BookingResponse.builder()
                .id(b.getId())
                .guestId(b.getGuest().getId())
                .guestName(b.getGuest().getName())
                .guestPhone(b.getGuest().getPhone())
                .roomTypeId(b.getRoomType().getId())
                .roomTypeName(b.getRoomType().getName())
                .roomId(b.getRoom() != null ? b.getRoom().getId() : null)
                .roomNumber(b.getRoom() != null ? b.getRoom().getRoomNumber() : null)
                .checkInDate(b.getCheckInDate())
                .checkOutDate(b.getCheckOutDate())
                .status(b.getStatus())
                .expectedPrice(b.getExpectedPrice())
                .actualPrice(b.getActualPrice())
                .cancellationFee(b.getCancellationFee())
                .note(b.getNote())
                .source(b.getSource())
                .guestEmail(b.getGuest().getEmail())
                .guestIdNumber(b.getGuest().getIdNumber())
                .createdAt(b.getCreatedAt())
                .groupBookingId(b.getGroupBooking() != null ? b.getGroupBooking().getId() : null)
                .build();
    }
}
