package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
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
    private final AuditLogService auditLogService;
    private final CancellationPolicyRepository cancellationPolicyRepository;

    @Override
    public List<BookingResponse> getAll() {
        return bookingRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
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
                "Đổi từ phòng " + oldRoomNumber + " sang " + newRoom.getRoomNumber());
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
        Booking booking = findById(bookingId);
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException("Chỉ có thể nhận phòng khi đặt phòng ở trạng thái CONFIRMED");
        }
        if (booking.getRoom() == null) {
            throw new IllegalArgumentException("Phải gán phòng trước khi nhận phòng");
        }
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.getRoom().setStatus(RoomStatus.OCCUPIED);
        roomRepository.save(booking.getRoom());
        bookingRepository.save(booking);
        auditLogService.log("Booking", booking.getId(), "CHECK_IN", actor,
                "Nhận phòng " + booking.getRoom().getRoomNumber());
        return toResponse(booking);
    }

    @Override
    @Transactional
    public BookingResponse checkOut(Long bookingId, User actor) {
        Booking booking = findById(bookingId);
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể trả phòng khi đặt phòng ở trạng thái CHECKED_IN");
        }
        
        // Bắt buộc phải thanh toán hóa đơn xong mới được trả phòng
        Invoice invoice = invoiceRepository.findByBookingId(bookingId).orElse(null);
        if (invoice == null || invoice.getStatus() != InvoiceStatus.PAID) {
            throw new IllegalArgumentException("Phải lập hóa đơn và thanh toán đầy đủ trước khi trả phòng!");
        }

        booking.setStatus(BookingStatus.CHECKED_OUT);
        if (invoice != null && invoice.getTotalAmount() != null) {
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
        if (req.getNote() != null) {
            booking.setNote((booking.getNote() != null ? booking.getNote() + "\n" : "") + req.getNote());
        }
        booking = bookingRepository.save(booking);
        auditLogService.log("Booking", booking.getId(), "EXTEND_STAY", actor,
                "Gia hạn " + req.getAdditionalNights() + " đêm đến " + newCheckOut +
                ", tiền thêm: " + additionalCost + "đ");
        return toResponse(booking);
    }

    // ===== NCL-04-CN-007: Kiểm tra khả dụng gia hạn =====
    @Override
    public Map<String, Object> checkExtendAvailability(Long bookingId, int nights) {
        Booking booking = findById(bookingId);
        if (booking.getRoom() == null) {
            return Map.of("available", false, "reason", "Phòng chưa được gán");
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
                    : booking.getRoomType().getBasePrice();
            nightPrices.add(Map.of("date", night.toString(), "price", price));
        }
        BigDecimal totalAdditional = calculatePrice(booking.getRoomType(), booking.getCheckOutDate(), newCheckOut);

        return Map.of(
                "available", conflicts.isEmpty(),
                "conflictDate", conflicts.isEmpty() ? null : conflicts.get(0).getCheckInDate().toString(),
                "newCheckOutDate", newCheckOut.toString(),
                "nightPrices", nightPrices,
                "totalAdditionalCost", totalAdditional
        );
    }

    // ===== NCL-04-CN-008: Nâng hạng phòng giữa kỳ lưu trú (QTN-22) =====
    @Override
    @Transactional
    public BookingResponse upgradeRoom(Long bookingId, UpgradeRoomRequest req, User actor) {
        Booking booking = findById(bookingId);
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể nâng hạng khi khách đang lưu trú (CHECKED_IN)");
        }

        Room newRoom = roomRepository.findById(req.getNewRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng"));

        // Ngày hôm nay trở đi là phần thời gian còn lại
        LocalDate today = LocalDate.now();
        LocalDate checkOut = booking.getCheckOutDate();

        // Kiểm tra phòng mới trống TRỌN phần thời gian còn lại (QTN-22)
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                newRoom.getId(), today, checkOut, bookingId);
        if (!conflicts.isEmpty()) {
            throw new IllegalArgumentException(
                "Phòng " + newRoom.getRoomNumber() + " chỉ trống một phần. Phải trống trọn phần thời gian còn lại (đến " + checkOut + ")."
            );
        }

        // Tính chênh lệch giá cho các đêm còn lại
        BigDecimal oldPrice = calculatePrice(booking.getRoomType(), today, checkOut);
        BigDecimal newPrice = calculatePrice(newRoom.getRoomType(), today, checkOut);
        BigDecimal priceDiff = newPrice.subtract(oldPrice); // Dương = nâng hạng, âm = hạ hạng

        // Hạ hạng bắt buộc nhập lý do (NCL-04-CN-008-TC-03)
        if (priceDiff.compareTo(BigDecimal.ZERO) < 0 && (req.getReason() == null || req.getReason().isBlank())) {
            throw new IllegalArgumentException("Vui lòng nhập lý do khi chuyển xuống hạng thấp hơn");
        }

        String oldRoomNumber = booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "Chưa gán";

        // Chuyển phòng cũ sang DIRTY (vếa trống)
        if (booking.getRoom() != null) {
            booking.getRoom().setStatus(RoomStatus.DIRTY);
            roomRepository.save(booking.getRoom());
        }
        // Phòng mới chuyển sang OCCUPIED
        newRoom.setStatus(RoomStatus.OCCUPIED);
        roomRepository.save(newRoom);

        // Cập nhật booking
        booking.setRoom(newRoom);
        booking.setRoomType(newRoom.getRoomType());
        // Cập nhật tiền: giữ phần đã nhận, cộng/trừ chênh lệch
        if (booking.getExpectedPrice() != null) {
            booking.setExpectedPrice(booking.getExpectedPrice().add(priceDiff));
            booking.setActualPrice(booking.getExpectedPrice());
        }
        booking.setNote((booking.getNote() != null ? booking.getNote() + "\n" : "") +
                (req.getReason() != null ? req.getReason() : ""));
        booking = bookingRepository.save(booking);

        String upgradeType = priceDiff.compareTo(BigDecimal.ZERO) >= 0 ? "Nâng hạng" : "Hạ hạng";
        auditLogService.log("Booking", booking.getId(), "UPGRADE_ROOM", actor,
                upgradeType + " từ phòng " + oldRoomNumber + " sang " + newRoom.getRoomNumber() +
                ", chênh lệch: " + priceDiff + "đ");
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
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        BigDecimal total = BigDecimal.ZERO;
        for (long i = 0; i < nights; i++) {
            LocalDate night = checkIn.plusDays(i);
            List<?> seasonal = seasonalPriceRepository.findByRoomTypeAndDate(roomType.getId(), night);
            if (!seasonal.isEmpty()) {
                total = total.add(((plant.stay.model.SeasonalPrice) seasonal.get(0)).getPricePerNight());
            } else {
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
                .build();
    }
}
