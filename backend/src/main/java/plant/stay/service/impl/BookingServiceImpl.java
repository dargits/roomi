package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.BookingRequest;
import plant.stay.dto.request.ExtendStayRequest;
import plant.stay.dto.request.RescheduleDateRequest;
import plant.stay.dto.request.UpgradeRoomRequest;
import plant.stay.dto.response.BookingResponse;
import plant.stay.dto.response.RescheduleDatePreviewResponse;
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
    private final LoyaltyTierRepository loyaltyTierRepository;
    private final DepositPolicyRepository depositPolicyRepository;
    private final DebtApprovalRepository debtApprovalRepository;
    private final plant.stay.service.PricingService pricingService;

    @Override
    public List<BookingResponse> getAll() {
        return bookingRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt", "id"))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<BookingResponse> search(String query, BookingStatus status, LocalDate fromDate, LocalDate toDate) {
        if (query != null && !query.trim().isEmpty() && query.trim().length() < 3) {
            throw new IllegalArgumentException("Từ khóa tìm kiếm phải có ít nhất 3 ký tự");
        }

        List<Booking> all = bookingRepository.findAll();
        LocalDate today = LocalDate.now();

        return all.stream()
                .filter(b -> {
                    if (query != null && !query.trim().isEmpty()) {
                        String q = query.trim().toLowerCase();
                        boolean matchId = String.valueOf(b.getId()).contains(q);
                        boolean matchName = b.getGuest() != null && b.getGuest().getName() != null 
                                && b.getGuest().getName().toLowerCase().contains(q);
                        boolean matchPhone = b.getGuest() != null && b.getGuest().getPhone() != null 
                                && b.getGuest().getPhone().contains(q);
                        if (!matchId && !matchName && !matchPhone) {
                            return false;
                        }
                    }
                    if (status != null && b.getStatus() != status) {
                        return false;
                    }
                    if (fromDate != null && b.getCheckInDate() != null && b.getCheckInDate().isBefore(fromDate)) {
                        return false;
                    }
                    if (toDate != null && b.getCheckInDate() != null && b.getCheckInDate().isAfter(toDate)) {
                        return false;
                    }
                    return true;
                })
                .sorted((b1, b2) -> {
                    long d1 = b1.getCheckInDate() != null ? Math.abs(ChronoUnit.DAYS.between(b1.getCheckInDate(), today)) : Long.MAX_VALUE;
                    long d2 = b2.getCheckInDate() != null ? Math.abs(ChronoUnit.DAYS.between(b2.getCheckInDate(), today)) : Long.MAX_VALUE;
                    int diff = Long.compare(d1, d2);
                    if (diff != 0) return diff;
                    return Long.compare(b2.getId() != null ? b2.getId() : 0L, b1.getId() != null ? b1.getId() : 0L);
                })
                .map(this::toResponse)
                .collect(Collectors.toList());
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

        int guestCount = request.getGuestCount() != null ? request.getGuestCount() : (roomType.getStandardCapacity() != null ? roomType.getStandardCapacity() : 2);
        int maxCap = roomType.getMaxCapacity() != null ? roomType.getMaxCapacity() : 2;
        if (guestCount > maxCap) {
            throw new IllegalArgumentException("Số khách (" + guestCount + ") vượt quá sức chứa tối đa của phòng (" + maxCap + " người). Vui lòng chọn loại phòng lớn hơn.");
        }

        var breakdown = pricingService.calculateBreakdown(roomType.getId(), request.getCheckInDate(), request.getCheckOutDate(), guestCount, request.getChildCount());
        BigDecimal expectedPrice = breakdown.getGrandTotal();

        String finalNote = request.getNote();
        if (breakdown.getExtraGuests() > 0) {
            String surchargeNote = "[Phụ thu thêm " + breakdown.getExtraGuests() + " người: " + breakdown.getTotalExtraCharge().toPlainString() + " đ]";
            finalNote = (finalNote != null && !finalNote.isBlank()) ? (finalNote + " " + surchargeNote) : surchargeNote;
        }

        Booking booking = Booking.builder()
                .guest(guest)
                .roomType(roomType)
                .room(room)
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .status(BookingStatus.NEW)
                .expectedPrice(expectedPrice)
                .actualPrice(expectedPrice)
                .note(finalNote)
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

        // Nếu booking thuộc hồ sơ đoàn, bắt buộc đoàn phải hoàn thành tiền đặt cọc tối thiểu trước khi xếp phòng
        if (booking.getGroupBooking() != null) {
            Long groupBookingId = booking.getGroupBooking().getId();
            List<Booking> groupBookings = bookingRepository.findByGroupBookingId(groupBookingId);
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

            BigDecimal expectedTotal = groupBookings.stream()
                    .filter(b -> b.getStatus() != BookingStatus.CANCELLED && b.getStatus() != BookingStatus.NO_SHOW)
                    .map(Booking::getExpectedPrice)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal requiredDeposit = expectedTotal.multiply(BigDecimal.valueOf(0.3)).setScale(0, RoundingMode.HALF_UP);

            if (totalCollectedDeposit.compareTo(BigDecimal.ZERO) <= 0 || (requiredDeposit.compareTo(BigDecimal.ZERO) > 0 && totalCollectedDeposit.compareTo(requiredDeposit) < 0)) {
                throw new IllegalArgumentException("Booking #" + bookingId + " thuộc hồ sơ đoàn #" + groupBookingId
                        + " chưa hoàn thành tiền đặt cọc (yêu cầu tối thiểu " + requiredDeposit.toBigInteger()
                        + " đ, đã thu " + totalCollectedDeposit.toBigInteger() + " đ). Vui lòng thu tiền đặt cọc cho đoàn trước khi xếp phòng.");
            }
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
        if (booking.getRoom().getStatus() != RoomStatus.AVAILABLE) {
            String stDesc = booking.getRoom().getStatus() == RoomStatus.DIRTY ? "Cần dọn dẹp" :
                    (booking.getRoom().getStatus() == RoomStatus.INSPECTING ? "Chờ kiểm tra" :
                    (booking.getRoom().getStatus() == RoomStatus.MAINTENANCE ? "Đang bảo trì" : "Đang có khách"));
            throw new IllegalArgumentException("Phòng " + booking.getRoom().getRoomNumber() + " đang ở trạng thái '" + stDesc + "', chưa sẵn sàng đón khách.");
        }

        List<Guest> stayingGuests = new java.util.ArrayList<>();
        if (req != null && req.getGuests() != null) {
            int maxCap = booking.getRoomType() != null && booking.getRoomType().getMaxCapacity() != null
                    ? booking.getRoomType().getMaxCapacity() : 10;
            if (req.getGuests().size() > maxCap) {
                throw new IllegalArgumentException("Số lượng khách nhận phòng (" + req.getGuests().size() + 
                        ") vượt quá sức chứa tối đa của phòng (" + maxCap + " người). Vui lòng chuyển sang loại phòng lớn hơn.");
            }

            for (plant.stay.dto.request.GuestCheckInDto dto : req.getGuests()) {
                Guest guest = null;

                if (dto.getName() != null && booking.getGuest().getName() != null && 
                    dto.getName().trim().equalsIgnoreCase(booking.getGuest().getName().trim())) {
                    guest = booking.getGuest();
                }

                if (guest == null && dto.getIdNumber() != null && !dto.getIdNumber().trim().isEmpty()) {
                    guest = guestRepository.findFirstByIdNumberOrderByIdDesc(dto.getIdNumber().trim()).orElse(null);
                }
                
                String cleanPhone = (dto.getPhone() != null && !dto.getPhone().trim().isEmpty()) ? dto.getPhone().trim() : null;
                String cleanIdNumber = (dto.getIdNumber() != null && !dto.getIdNumber().trim().isEmpty()) ? dto.getIdNumber().trim() : null;
                String cleanName = (dto.getName() != null && !dto.getName().trim().isEmpty()) ? dto.getName().trim() : "Khách lưu trú";

                if (guest == null) {
                    guest = Guest.builder()
                            .name(cleanName)
                            .idNumber(cleanIdNumber)
                            .phone(cleanPhone)
                            .build();
                    guest = guestRepository.save(guest);
                } else {
                    boolean updated = false;
                    if (!cleanName.equals(guest.getName())) {
                        guest.setName(cleanName);
                        updated = true;
                    }
                    if (cleanIdNumber != null && !cleanIdNumber.equals(guest.getIdNumber())) {
                        guest.setIdNumber(cleanIdNumber);
                        updated = true;
                    }
                    if (cleanPhone != null && !cleanPhone.equals(guest.getPhone())) {
                        guest.setPhone(cleanPhone);
                        updated = true;
                    }
                    if (updated) {
                        guest = guestRepository.save(guest);
                    }
                }

                if (guest.getIdentityDocuments() == null) {
                    guest.setIdentityDocuments(new java.util.ArrayList<>());
                }
                boolean docsUpdated = false;
                if (dto.getFrontImage() != null && !dto.getFrontImage().trim().isEmpty()) {
                    IdentityDocument frontDoc = guest.getIdentityDocuments().stream()
                            .filter(d -> d.getDocumentType() == IdentityDocumentType.NATIONAL_ID_FRONT)
                            .findFirst().orElse(null);
                    if (frontDoc == null) {
                        frontDoc = IdentityDocument.builder()
                                .guest(guest)
                                .documentType(IdentityDocumentType.NATIONAL_ID_FRONT)
                                .documentNumber(cleanIdNumber)
                                .imageUrl(dto.getFrontImage().trim())
                                .verified(false)
                                .build();
                        guest.getIdentityDocuments().add(frontDoc);
                        docsUpdated = true;
                    } else if (!dto.getFrontImage().trim().equals(frontDoc.getImageUrl())) {
                        frontDoc.setImageUrl(dto.getFrontImage().trim());
                        frontDoc.setDocumentNumber(cleanIdNumber);
                        docsUpdated = true;
                    }
                }

                if (dto.getBackImage() != null && !dto.getBackImage().trim().isEmpty()) {
                    IdentityDocument backDoc = guest.getIdentityDocuments().stream()
                            .filter(d -> d.getDocumentType() == IdentityDocumentType.NATIONAL_ID_BACK)
                            .findFirst().orElse(null);
                    if (backDoc == null) {
                        backDoc = IdentityDocument.builder()
                                .guest(guest)
                                .documentType(IdentityDocumentType.NATIONAL_ID_BACK)
                                .documentNumber(cleanIdNumber)
                                .imageUrl(dto.getBackImage().trim())
                                .verified(false)
                                .build();
                        guest.getIdentityDocuments().add(backDoc);
                        docsUpdated = true;
                    } else if (!dto.getBackImage().trim().equals(backDoc.getImageUrl())) {
                        backDoc.setImageUrl(dto.getBackImage().trim());
                        backDoc.setDocumentNumber(cleanIdNumber);
                        docsUpdated = true;
                    }
                }
                if (docsUpdated) {
                    guest = guestRepository.save(guest);
                }

                stayingGuests.add(guest);
            }
        }
        booking.setStayingGuests(stayingGuests);

        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckedInAt(LocalDateTime.now());
        booking.getRoom().setStatus(RoomStatus.OCCUPIED);
        roomRepository.save(booking.getRoom());
        Booking savedBooking = bookingRepository.save(booking);

        StayDeclaration declaration = stayDeclarationRepository.findByBookingId(savedBooking.getId())
                .orElseGet(() -> StayDeclaration.builder()
                        .booking(savedBooking)
                        .status(StayDeclarationStatus.PENDING)
                        .build());
        declaration = stayDeclarationRepository.save(declaration);
        savedBooking.setStayDeclaration(declaration);

        auditLogService.log("Booking", savedBooking.getId(), "CHECK_IN", actor,
                "Nhận phòng " + savedBooking.getRoom().getRoomNumber() + 
            (req != null && req.getGuests() != null && !req.getGuests().isEmpty() ? " (" + req.getGuests().size() + " khách lưu trú)" : ""));
        return toResponse(savedBooking);
    }

    @Override
    @Transactional
    public plant.stay.dto.response.BulkCheckInResultResponse bulkCheckIn(plant.stay.dto.request.BulkCheckInRequest req, User actor) {
        plant.stay.dto.response.BulkCheckInResultResponse result = new plant.stay.dto.response.BulkCheckInResultResponse();
        if (req == null || req.getRooms() == null || req.getRooms().isEmpty()) {
            return result;
        }

        result.setTotalRequested(req.getRooms().size());

        for (plant.stay.dto.request.BulkCheckInRoomRequest roomReq : req.getRooms()) {
            Long bId = roomReq.getBookingId();
            try {
                Booking booking = bookingRepository.findById(bId).orElse(null);
                if (booking == null) {
                    result.getFailedRooms().add(new plant.stay.dto.response.BulkCheckInFailureDto(bId, "N/A", "Không tìm thấy đặt phòng #" + bId));
                    continue;
                }
                String roomNum = booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "Chưa gán";
                if (booking.getStatus() != BookingStatus.CONFIRMED) {
                    result.getFailedRooms().add(new plant.stay.dto.response.BulkCheckInFailureDto(bId, roomNum, "Đặt phòng không ở trạng thái CONFIRMED (hiện tại: " + booking.getStatus() + ")"));
                    continue;
                }
                if (booking.getRoom() == null) {
                    result.getFailedRooms().add(new plant.stay.dto.response.BulkCheckInFailureDto(bId, "Chưa gán", "Đặt phòng chưa được gán số phòng"));
                    continue;
                }
                if (booking.getRoom().getStatus() != RoomStatus.AVAILABLE) {
                    String stDesc = booking.getRoom().getStatus() == RoomStatus.DIRTY ? "Cần dọn dẹp" :
                            (booking.getRoom().getStatus() == RoomStatus.INSPECTING ? "Chờ kiểm tra" :
                            (booking.getRoom().getStatus() == RoomStatus.MAINTENANCE ? "Đang bảo trì" : "Đang có khách"));
                    result.getFailedRooms().add(new plant.stay.dto.response.BulkCheckInFailureDto(bId, roomNum, "Phòng " + roomNum + " đang ở trạng thái '" + stDesc + "', chưa sẵn sàng đón khách. Hãy giục buồng phòng."));
                    continue;
                }

                plant.stay.dto.request.CheckInRequest checkInReq = new plant.stay.dto.request.CheckInRequest();
                checkInReq.setGuests(roomReq.getGuests());
                BookingResponse res = checkIn(bId, checkInReq, actor);
                result.getSuccessfulRooms().add(res);

                // Kiểm tra giấy tờ tùy thân CCCD
                boolean hasIdDoc = false;
                if (roomReq.getGuests() != null) {
                    for (var g : roomReq.getGuests()) {
                        if (g.getIdNumber() != null && !g.getIdNumber().trim().isEmpty()) {
                            hasIdDoc = true;
                            break;
                        }
                    }
                }
                if (!hasIdDoc && booking.getGuest() != null && booking.getGuest().getIdNumber() != null && !booking.getGuest().getIdNumber().trim().isEmpty()) {
                    hasIdDoc = true;
                }
                if (!hasIdDoc) {
                    result.setMissingDocumentRoomCount(result.getMissingDocumentRoomCount() + 1);
                }
            } catch (Exception e) {
                result.getFailedRooms().add(new plant.stay.dto.response.BulkCheckInFailureDto(bId, "Lỗi", e.getMessage()));
            }
        }

        auditLogService.log("Booking", 0L, "BULK_CHECK_IN", actor,
                "Nhận phòng hàng loạt cho đoàn: Thành công " + result.getSuccessfulRooms().size() + "/" + result.getTotalRequested() + " phòng" +
                (result.getMissingDocumentRoomCount() > 0 ? " (" + result.getMissingDocumentRoomCount() + " phòng chưa đủ CCCD)" : ""));

        return result;
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
        if (invoice != null && invoice.getStatus() != InvoiceStatus.ADJUSTED) {
            List<Payment> currentPayments = paymentRepository.findByInvoiceId(invoice.getId());
            boolean hasDepositRefund = currentPayments.stream().anyMatch(p -> p.getAmount().compareTo(BigDecimal.ZERO) < 0);
            List<Deposit> deposits = depositRepository.findByBookingIdOrderByCreatedAtDesc(bookingId);

            for (Deposit d : deposits) {
                BigDecimal effectiveDeposit = BigDecimal.ZERO;
                if (d.getStatus() == DepositStatus.COLLECTED || d.getStatus() == DepositStatus.SHORT_PAID) {
                    BigDecimal collected = d.getCollectedAmount() != null ? d.getCollectedAmount() : BigDecimal.ZERO;
                    BigDecimal refunded = d.getRefundedAmount() != null ? d.getRefundedAmount() : BigDecimal.ZERO;
                    BigDecimal penalty = d.getPenaltyAmount() != null ? d.getPenaltyAmount() : BigDecimal.ZERO;
                    effectiveDeposit = collected.subtract(refunded).subtract(penalty).max(BigDecimal.ZERO);
                }

                BigDecimal netDepositPaid = currentPayments.stream()
                        .filter(p -> p.getNote() != null && (
                                p.getNote().contains("Mã cọc #" + d.getId()) ||
                                (deposits.size() == 1 && (p.getNote().contains("đặt cọc") || p.getNote().contains("cọc") || p.getNote().contains("Deposit")))
                        ))
                        .map(Payment::getAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (netDepositPaid.compareTo(effectiveDeposit) < 0) {
                    BigDecimal diff = effectiveDeposit.subtract(netDepositPaid);
                    if (diff.compareTo(BigDecimal.ZERO) > 0) {
                        Payment depositPayment = Payment.builder()
                                .invoice(invoice)
                                .amount(diff)
                                .method(d.getPaymentMethod() != null ? d.getPaymentMethod() : PaymentMethod.CASH)
                                .paidAt(d.getCollectedAt() != null ? d.getCollectedAt() : LocalDateTime.now())
                                .collectedBy(d.getCollectedBy() != null ? d.getCollectedBy() : actor)
                                .note("Trừ tiền đặt cọc đã thu (Mã cọc #" + d.getId() + ")")
                                .build();
                        paymentRepository.save(depositPayment);
                    }
                } else if (netDepositPaid.compareTo(effectiveDeposit) > 0) {
                    BigDecimal excess = netDepositPaid.subtract(effectiveDeposit);
                    Payment refundPayment = Payment.builder()
                            .invoice(invoice)
                            .amount(excess.negate())
                            .method(d.getPaymentMethod() != null ? d.getPaymentMethod() : PaymentMethod.CASH)
                            .paidAt(d.getProcessedAt() != null ? d.getProcessedAt() : LocalDateTime.now())
                            .collectedBy(d.getProcessedBy() != null ? d.getProcessedBy() : actor)
                            .note("Hoàn trả tiền cọc đã khấu trừ (Mã cọc #" + d.getId() + ")")
                            .build();
                    paymentRepository.save(refundPayment);
                    hasDepositRefund = true;
                }
            }

            BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                    .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            if (invoice.getStatus() != InvoiceStatus.PENDING_DISCOUNT_APPROVAL && invoice.getStatus() != InvoiceStatus.ADJUSTED) {
                if (invoice.getStatus() == InvoiceStatus.PENDING || invoice.getStatus() == InvoiceStatus.PENDING_PAYMENT) {
                    if (totalPaid.compareTo(invoice.getTotalAmount()) >= 0) {
                        invoice.setStatus(InvoiceStatus.PAID);
                        invoiceRepository.save(invoice);
                    }
                } else if (invoice.getStatus() == InvoiceStatus.PAID) {
                    if (hasDepositRefund && totalPaid.compareTo(invoice.getTotalAmount()) < 0) {
                        invoice.setStatus(InvoiceStatus.PENDING);
                        invoiceRepository.save(invoice);
                    }
                }
            }
        }

        if (invoice == null || invoice.getStatus() != InvoiceStatus.PAID) {
            throw new IllegalArgumentException("Phải lập hóa đơn và thanh toán đầy đủ trước khi trả phòng!");
        }

        booking.setStatus(BookingStatus.CHECKED_OUT);
    booking.setCheckedOutAt(LocalDateTime.now());
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
            
            // Recalculate loyalty tier based on new points
            List<LoyaltyTier> tiers = loyaltyTierRepository.findAllByOrderByMinPointsAsc();
            LoyaltyTier bestTier = null;
            for (LoyaltyTier tier : tiers) {
                if (guest.getLoyaltyPoints() >= tier.getMinPoints()) {
                    bestTier = tier;
                }
            }
            guest.setLoyaltyTier(bestTier);
            
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
            BigDecimal price = pricingService != null
                    ? pricingService.calculateNightPrice(booking.getRoomType(), night).getAppliedPrice()
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

    // ===== NCL-04-CN-NEW: Dời lịch đặt phòng chưa nhận phòng =====

    /**
     * Preview: kiểm tra conflict + tính giá/cọc theo ngày mới.
     * KHÔNG lưu DB. An toàn để gọi nhiều lần trước khi xác nhận.
     */
    @Override
    @Transactional(readOnly = true)
    public RescheduleDatePreviewResponse previewReschedule(Long bookingId, RescheduleDateRequest req) {
        Booking booking = findById(bookingId);

        // Validate status
        if (booking.getStatus() != BookingStatus.NEW && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException(
                "Chỉ có thể dời lịch khi đặt phòng ở trạng thái Mới tạo (NEW) hoặc Đã xác nhận (CONFIRMED)");
        }

        LocalDate today = LocalDate.now();
        LocalDate newCheckIn = req.getNewCheckInDate();
        LocalDate newCheckOut = req.getNewCheckOutDate();

        // Validate ngày
        if (newCheckIn.isBefore(today)) {
            throw new IllegalArgumentException("Ngày nhận phòng mới không được sớm hơn ngày hiện tại (" + today + ")");
        }
        if (!newCheckOut.isAfter(newCheckIn)) {
            throw new IllegalArgumentException("Ngày trả phòng mới phải sau ngày nhận phòng mới");
        }

        // --- Kiểm tra xung đột phòng (chỉ khi đã gán phòng) ---
        boolean available = true;
        List<String> conflictDates = new java.util.ArrayList<>();
        Long conflictBookingId = null;
        List<RescheduleDatePreviewResponse.RoomSuggestion> alternativeRooms = new java.util.ArrayList<>();

        if (booking.getRoom() != null) {
            List<Booking> conflicts = bookingRepository.findConflictingBookings(
                    booking.getRoom().getId(), newCheckIn, newCheckOut, bookingId);
            if (!conflicts.isEmpty()) {
                available = false;
                // Thu thập các đêm bị trùng
                Booking firstConflict = conflicts.get(0);
                conflictBookingId = firstConflict.getId();
                LocalDate cStart = firstConflict.getCheckInDate().isBefore(newCheckIn)
                        ? newCheckIn : firstConflict.getCheckInDate();
                LocalDate cEnd = firstConflict.getCheckOutDate().isAfter(newCheckOut)
                        ? newCheckOut : firstConflict.getCheckOutDate();
                for (LocalDate d = cStart; d.isBefore(cEnd); d = d.plusDays(1)) {
                    conflictDates.add(d.toString());
                }
                // Tìm phòng cùng loại còn trống gợi ý
                List<Room> candidates = roomRepository.findAvailableWithoutConflicts(
                        booking.getRoomType().getId(), RoomStatus.AVAILABLE, newCheckIn, newCheckOut);
                for (Room r : candidates) {
                    if (!r.getId().equals(booking.getRoom().getId())) {
                        alternativeRooms.add(RescheduleDatePreviewResponse.RoomSuggestion.builder()
                                .roomId(r.getId())
                                .roomNumber(r.getRoomNumber())
                                .roomTypeName(r.getRoomType().getName())
                                .status(r.getStatus().name())
                                .build());
                    }
                }
            }
        }
        // Nếu chưa gán phòng: available = true (không cần kiểm tra conflict)

        // --- Tính giá ---
        BigDecimal oldPrice = calculatePrice(booking.getRoomType(), booking.getCheckInDate(), booking.getCheckOutDate());
        BigDecimal newPrice = calculatePrice(booking.getRoomType(), newCheckIn, newCheckOut);
        BigDecimal priceDiff = newPrice.subtract(oldPrice);

        // Chi tiết giá từng đêm mới
        long nights = ChronoUnit.DAYS.between(newCheckIn, newCheckOut);
        List<RescheduleDatePreviewResponse.NightPriceDto> nightPrices = new java.util.ArrayList<>();
        for (long i = 0; i < nights; i++) {
            LocalDate night = newCheckIn.plusDays(i);
            BigDecimal price = pricingService != null
                    ? pricingService.calculateNightPrice(booking.getRoomType(), night).getAppliedPrice()
                    : (booking.getRoomType().getBasePrice() != null ? booking.getRoomType().getBasePrice() : BigDecimal.ZERO);
            nightPrices.add(RescheduleDatePreviewResponse.NightPriceDto.builder()
                    .date(night.toString())
                    .price(price)
                    .build());
        }

        // --- Tính cọc ---
        BigDecimal collectedDeposit = BigDecimal.ZERO;
        List<Deposit> deposits = depositRepository.findByBookingIdOrderByCreatedAtDesc(bookingId);
        for (Deposit d : deposits) {
            if (d.getStatus() == DepositStatus.COLLECTED || d.getStatus() == DepositStatus.SHORT_PAID) {
                BigDecimal eff = d.getCollectedAmount() != null ? d.getCollectedAmount() : BigDecimal.ZERO;
                if (d.getRefundedAmount() != null) eff = eff.subtract(d.getRefundedAmount());
                if (d.getPenaltyAmount() != null) eff = eff.subtract(d.getPenaltyAmount());
                collectedDeposit = collectedDeposit.add(eff.max(BigDecimal.ZERO));
            }
        }

        BigDecimal newRequiredDeposit = BigDecimal.ZERO;
        try {
            DepositPolicy policy = null;
            if (booking.getRoomType() != null) {
                policy = depositPolicyRepository.findFirstByRoomTypeIdAndActiveTrue(booking.getRoomType().getId()).orElse(null);
            }
            if (policy == null) {
                policy = depositPolicyRepository.findFirstByRoomTypeIsNullAndActiveTrue().orElse(null);
            }
            if (policy != null) {
                newRequiredDeposit = newPrice
                        .multiply(policy.getDepositPercent())
                        .divide(BigDecimal.valueOf(100), 0, java.math.RoundingMode.HALF_UP);
            }
        } catch (Exception ignored) { /* Không để lỗi tính cọc chặn preview */ }

        BigDecimal depositDiff = newRequiredDeposit.subtract(collectedDeposit);

        return RescheduleDatePreviewResponse.builder()
                .available(available)
                .conflictDates(conflictDates)
                .conflictBookingId(conflictBookingId)
                .alternativeRooms(alternativeRooms)
                .oldPrice(oldPrice)
                .newPrice(newPrice)
                .priceDiff(priceDiff)
                .nightPrices(nightPrices)
                .collectedDeposit(collectedDeposit)
                .newRequiredDeposit(newRequiredDeposit)
                .depositDiff(depositDiff)
                .build();
    }

    /**
     * Confirm: lưu ngày mới vào DB (atomic).
     * Từ chối nếu phòng bị vướng booking khác trong khoảng ngày mới.
     */
    @Override
    @Transactional
    public BookingResponse confirmReschedule(Long bookingId, RescheduleDateRequest req, User actor) {
        Booking booking = findById(bookingId);

        // Validate status
        if (booking.getStatus() != BookingStatus.NEW && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException(
                "Chỉ có thể dời lịch khi đặt phòng ở trạng thái Mới tạo (NEW) hoặc Đã xác nhận (CONFIRMED)");
        }

        LocalDate today = LocalDate.now();
        LocalDate newCheckIn = req.getNewCheckInDate();
        LocalDate newCheckOut = req.getNewCheckOutDate();

        if (newCheckIn.isBefore(today)) {
            throw new IllegalArgumentException("Ngày nhận phòng mới không được sớm hơn ngày hiện tại (" + today + ")");
        }
        if (!newCheckOut.isAfter(newCheckIn)) {
            throw new IllegalArgumentException("Ngày trả phòng mới phải sau ngày nhận phòng mới");
        }

        // Kiểm tra conflict phòng (chỉ khi đã gán phòng)
        if (booking.getRoom() != null) {
            List<Booking> conflicts = bookingRepository.findConflictingBookings(
                    booking.getRoom().getId(), newCheckIn, newCheckOut, bookingId);
            if (!conflicts.isEmpty()) {
                Booking c = conflicts.get(0);
                // Xác định đêm đầu tiên bị trùng
                LocalDate firstConflict = c.getCheckInDate().isBefore(newCheckIn) ? newCheckIn : c.getCheckInDate();
                throw new IllegalArgumentException(
                    "Phòng " + booking.getRoom().getRoomNumber() +
                    " bị vướng đặt phòng #" + c.getId() +
                    " từ đêm " + firstConflict +
                    ". Vui lòng đổi sang phòng khác trước rồi dời lịch lại.");
            }
        }

        // Tính giá mới
        BigDecimal newPrice = calculatePrice(booking.getRoomType(), newCheckIn, newCheckOut);

        // Ghi vết ngày cũ vào note
        String oldRange = booking.getCheckInDate() + " → " + booking.getCheckOutDate();
        String newRange = newCheckIn + " → " + newCheckOut;
        String rescheduleNote = "[Dời lịch: " + oldRange + " → " + newRange + "]";
        if (req.getReason() != null && !req.getReason().isBlank()) {
            rescheduleNote += " Lý do: " + req.getReason().trim();
        }
        booking.setNote((booking.getNote() != null && !booking.getNote().isBlank()
                ? booking.getNote() + "\n" : "") + rescheduleNote);

        // Cập nhật ngày và giá
        booking.setCheckInDate(newCheckIn);
        booking.setCheckOutDate(newCheckOut);
        booking.setExpectedPrice(newPrice);
        booking.setActualPrice(newPrice);

        booking = bookingRepository.save(booking);

        auditLogService.log("Booking", booking.getId(), "RESCHEDULE", actor,
                "Dời lịch từ " + oldRange + " sang " + newRange +
                (req.getReason() != null && !req.getReason().isBlank() ? " | Lý do: " + req.getReason().trim() : ""));

        return toResponse(booking);
    }

    // ===== NCL-04-CN-NEW: Trả phòng sớm =====

    /**
     * Preview trả phòng sớm: tính số đêm thực tế + tiền phòng điều chỉnh.
     * KHÔNG lưu DB. An toàn để gọi nhiều lần.
     */
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> previewEarlyCheckout(Long bookingId) {
        Booking booking = findById(bookingId);
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể trả phòng sớm khi khách đang ở phòng (CHECKED_IN)");
        }

        LocalDate today = LocalDate.now();
        LocalDate originalCheckOut = booking.getCheckOutDate();

        if (!today.isBefore(originalCheckOut)) {
            throw new IllegalArgumentException("Hôm nay là ngày trả phòng hoặc đã qua — không cần trả phòng sớm. Dùng trả phòng thông thường.");
        }

        LocalDate actualCheckIn = booking.getCheckInDate();
        long actualNights = ChronoUnit.DAYS.between(actualCheckIn, today);
        if (actualNights <= 0) actualNights = 1;

        long originalNights = ChronoUnit.DAYS.between(actualCheckIn, originalCheckOut);
        long savedNights = originalNights - actualNights;

        // Tính tiền phòng thực tế theo số đêm thực tế
        BigDecimal actualRoomAmount = calculatePrice(booking.getRoomType(), actualCheckIn, today);
        BigDecimal originalRoomAmount = booking.getExpectedPrice() != null
                ? booking.getExpectedPrice() : BigDecimal.ZERO;
        BigDecimal difference = originalRoomAmount.subtract(actualRoomAmount);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("bookingId", bookingId);
        result.put("originalCheckOut", originalCheckOut.toString());
        result.put("newCheckOut", today.toString());
        result.put("originalNights", originalNights);
        result.put("actualNights", actualNights);
        result.put("savedNights", savedNights);
        result.put("originalRoomAmount", originalRoomAmount);
        result.put("actualRoomAmount", actualRoomAmount);
        result.put("difference", difference); // dương = khách được giảm tiền
        result.put("hasInvoice", invoiceRepository.findByBookingId(bookingId).isPresent());
        return result;
    }

    /**
     * Xác nhận trả phòng sớm: cập nhật checkOutDate = hôm nay, tính lại giá,
     * sau đó thực hiện checkout thông thường (sẽ validate hóa đơn).
     */
    @Override
    @Transactional
    public BookingResponse confirmEarlyCheckout(Long bookingId, User actor) {
        Booking booking = findById(bookingId);
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể trả phòng sớm khi khách đang ở phòng (CHECKED_IN)");
        }

        LocalDate today = LocalDate.now();
        LocalDate originalCheckOut = booking.getCheckOutDate();

        if (!today.isBefore(originalCheckOut)) {
            // Hôm nay >= ngày trả phòng dự kiến → checkout thông thường
            return checkOut(bookingId, actor);
        }

        LocalDate actualCheckIn = booking.getCheckInDate();
        long actualNights = ChronoUnit.DAYS.between(actualCheckIn, today);
        if (actualNights <= 0) actualNights = 1;

        // Tính lại tiền phòng theo số đêm thực tế
        BigDecimal actualRoomAmount = calculatePrice(booking.getRoomType(), actualCheckIn, today);

        // Ghi chú trả phòng sớm
        String earlyNote = "[Trả phòng sớm: " + today + " thay vì " + originalCheckOut +
                " | " + actualNights + " đêm thực tế | Tiền phòng điều chỉnh: " +
                String.format("%,.0f", actualRoomAmount.doubleValue()) + "đ]";
        booking.setNote((booking.getNote() != null && !booking.getNote().isBlank()
                ? booking.getNote() + "\n" : "") + earlyNote);

        // Cập nhật ngày trả phòng và giá
        booking.setCheckOutDate(today);
        booking.setExpectedPrice(actualRoomAmount);
        booking.setActualPrice(actualRoomAmount);
        bookingRepository.save(booking);

        // Cập nhật hóa đơn PENDING nếu có
        Invoice pendingInvoice = invoiceRepository.findByBookingId(bookingId).orElse(null);
        if (pendingInvoice != null && pendingInvoice.getStatus() == InvoiceStatus.PENDING) {
            pendingInvoice.setRoomAmount(actualRoomAmount);
            BigDecimal serviceAmt = pendingInvoice.getServiceAmount() != null ? pendingInvoice.getServiceAmount() : BigDecimal.ZERO;
            BigDecimal discountAmt = pendingInvoice.getDiscountAmount() != null ? pendingInvoice.getDiscountAmount() : BigDecimal.ZERO;
            pendingInvoice.setTotalAmount(actualRoomAmount.add(serviceAmt).subtract(discountAmt));
            invoiceRepository.save(pendingInvoice);
        }

        auditLogService.log("Booking", bookingId, "EARLY_CHECKOUT", actor,
                "Trả phòng sớm từ " + originalCheckOut + " về " + today +
                ", tiền phòng điều chỉnh: " + actualRoomAmount + "đ");

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

    // Tính giá dự kiến theo thứ tự ưu tiên: Lễ > Cuối tuần > Mùa > Cơ bản (NCL-02-CN-006)
    private BigDecimal calculatePrice(RoomType roomType, LocalDate checkIn, LocalDate checkOut) {
        if (roomType == null || checkIn == null || checkOut == null) {
            return BigDecimal.ZERO;
        }
        return pricingService.calculateTotalPrice(roomType, checkIn, checkOut);
    }

    private Booking findById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt phòng với id: " + id));
    }

    public BookingResponse toResponse(Booking b) {
        String paymentStatus = "UNPAID";
        boolean payLaterCheckout = false;
        try {
            Invoice inv = invoiceRepository.findInvoicesCoveringBooking(b.getId()).stream().findFirst().orElse(null);
            if (inv != null && inv.getStatus() != null) {
                paymentStatus = inv.getStatus().name();
            }
        } catch (Exception ignored) {}
        if (b.getStatus() == BookingStatus.CHECKED_OUT) {
            payLaterCheckout = debtApprovalRepository.existsActiveApprovedDebtByBookingId(b.getId());
        }

        java.util.List<plant.stay.dto.response.GuestResponse> stayingGuestsDto = null;
        if (b.getStayingGuests() != null && !b.getStayingGuests().isEmpty()) {
            stayingGuestsDto = b.getStayingGuests().stream()
                    .map(g -> plant.stay.dto.response.GuestResponse.builder()
                            .id(g.getId())
                            .name(g.getName())
                            .phone(g.getPhone())
                            .idNumber(g.getIdNumber())
                            .email(g.getEmail())
                            .loyaltyPoints(g.getLoyaltyPoints())
                            .build())
                    .collect(java.util.stream.Collectors.toList());
        }

        return BookingResponse.builder()
                .id(b.getId())
                .guestId(b.getGuest().getId())
                .guestName(b.getGuest().getName())
                .guestPhone(b.getGuest().getPhone())
                .roomTypeId(b.getRoomType().getId())
                .roomTypeName(b.getRoomType().getName())
                .roomId(b.getRoom() != null ? b.getRoom().getId() : null)
                .roomNumber(b.getRoom() != null ? b.getRoom().getRoomNumber() : null)
                .roomCapacity(b.getRoomType() != null ? b.getRoomType().getMaxCapacity() : null)
                .standardCapacity(b.getRoomType() != null ? b.getRoomType().getStandardCapacity() : 2)
                .maxCapacity(b.getRoomType() != null ? b.getRoomType().getMaxCapacity() : 2)
                .extraPersonChargePerNight(b.getRoomType() != null && b.getRoomType().getExtraPersonChargePerNight() != null ? b.getRoomType().getExtraPersonChargePerNight() : BigDecimal.ZERO)
                .maxChildAgeFree(b.getRoomType() != null ? b.getRoomType().getMaxChildAgeFree() : 6)
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
                .paymentStatus(paymentStatus)
                .roomStatus(b.getRoom() != null && b.getRoom().getStatus() != null ? b.getRoom().getStatus().name() : null)
                .payLaterCheckout(payLaterCheckout)
                .stayingGuests(stayingGuestsDto)
                .build();
    }
}
