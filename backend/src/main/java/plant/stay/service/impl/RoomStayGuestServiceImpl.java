package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.RoomStayGuestCreateDto;
import plant.stay.dto.response.RoomStayGuestResponseDto;
import plant.stay.dto.response.StayingGuestsSummaryDto;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.BookingServiceUsageRepository;
import plant.stay.repository.ExtraServiceRepository;
import plant.stay.repository.InvoiceRepository;
import plant.stay.repository.RoomStayGuestRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.PricingService;
import plant.stay.service.RoomStayGuestService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomStayGuestServiceImpl implements RoomStayGuestService {

    private final RoomStayGuestRepository roomStayGuestRepository;
    private final BookingRepository bookingRepository;
    private final AuditLogService auditLogService;
    private final PricingService pricingService;
    private final InvoiceRepository invoiceRepository;
    private final BookingServiceUsageRepository bookingServiceUsageRepository;
    private final ExtraServiceRepository extraServiceRepository;

    private record SurchargeCalculationResult(
            int totalStaying,
            int extraGuests,
            int childCount,
            int chargeableExtraGuests,
            BigDecimal extraChargePerNight,
            BigDecimal totalExtraCharge,
            BigDecimal baseRoomPrice,
            BigDecimal currentActualPrice
    ) {}

    @Override
    @Transactional
    public List<RoomStayGuestResponseDto> getStayingGuests(Long bookingId, User actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt phòng #" + bookingId));

        List<RoomStayGuest> list = roomStayGuestRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);

        // Nếu chưa có ai trong room_stay_guests nhưng booking có guest chính, tự khởi tạo người đứng tên
        if (list.isEmpty()) {
            if (booking.getGuest() != null) {
                Guest mainGuest = booking.getGuest();
                RoomStayGuest primary = RoomStayGuest.builder()
                        .booking(booking)
                        .fullName(mainGuest.getName())
                        .documentType("CCCD")
                        .documentNumber(mainGuest.getIdNumber())
                        .isPrimaryGuest(true)
                        .isChild(false)
                        .checkInAt(booking.getCheckedInAt() != null ? booking.getCheckedInAt() : LocalDateTime.now())
                        .build();
                primary = roomStayGuestRepository.save(primary);
                list.add(primary);
            }
            if (booking.getStayingGuests() != null) {
                for (Guest g : booking.getStayingGuests()) {
                    if (booking.getGuest() != null && g.getId().equals(booking.getGuest().getId())) {
                        continue;
                    }
                    RoomStayGuest extra = RoomStayGuest.builder()
                            .booking(booking)
                            .fullName(g.getName())
                            .documentType("CCCD")
                            .documentNumber(g.getIdNumber())
                            .isPrimaryGuest(false)
                            .isChild(false)
                            .checkInAt(booking.getCheckedInAt() != null ? booking.getCheckedInAt() : LocalDateTime.now())
                            .build();
                    extra = roomStayGuestRepository.save(extra);
                    list.add(extra);
                }
            }
        }

        recalculateBookingPriceAndSurcharges(booking, actor);

        boolean canViewFullDocs = actor.getRole() == Role.OWNER || actor.getRole() == Role.ADMIN || actor.getRole() == Role.RECEPTIONIST;

        return list.stream().map(g -> toDto(g, canViewFullDocs)).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public StayingGuestsSummaryDto getStayingGuestsSummary(Long bookingId, User actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt phòng #" + bookingId));

        List<RoomStayGuestResponseDto> guestDtos = getStayingGuests(bookingId, actor);
        SurchargeCalculationResult result = recalculateBookingPriceAndSurcharges(booking, actor);

        RoomType roomType = booking.getRoomType();
        long nights = ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate());
        if (nights <= 0) nights = 1;

        int stdCap = roomType != null && roomType.getStandardCapacity() != null ? roomType.getStandardCapacity() : 2;
        int maxCap = roomType != null && roomType.getMaxCapacity() != null ? roomType.getMaxCapacity() : 2;
        BigDecimal extraRate = roomType != null && roomType.getExtraPersonChargePerNight() != null ? roomType.getExtraPersonChargePerNight() : BigDecimal.ZERO;
        int maxChildAge = roomType != null && roomType.getMaxChildAgeFree() != null ? roomType.getMaxChildAgeFree() : 6;

        return StayingGuestsSummaryDto.builder()
                .guests(guestDtos)
                .standardCapacity(stdCap)
                .maxCapacity(maxCap)
                .extraPersonChargePerNight(extraRate)
                .maxChildAgeFree(maxChildAge)
                .totalNights(nights)
                .totalGuests(result.totalStaying())
                .extraGuests(result.extraGuests())
                .childCount(result.childCount())
                .chargeableExtraGuests(result.chargeableExtraGuests())
                .extraChargePerNight(result.extraChargePerNight())
                .totalExtraCharge(result.totalExtraCharge())
                .baseRoomPrice(result.baseRoomPrice())
                .currentActualPrice(result.currentActualPrice())
                .build();
    }

    @Override
    @Transactional
    public RoomStayGuestResponseDto addStayingGuest(Long bookingId, RoomStayGuestCreateDto dto, User actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt phòng #" + bookingId));

        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể thêm khách cùng phòng khi đặt phòng đang ở trạng thái CHECKED_IN!");
        }

        // Đảm bảo khách chính đã được khởi tạo nếu chưa có
        List<RoomStayGuest> existing = roomStayGuestRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
        if (existing.isEmpty() && booking.getGuest() != null) {
            Guest mainGuest = booking.getGuest();
            RoomStayGuest primary = RoomStayGuest.builder()
                    .booking(booking)
                    .fullName(mainGuest.getName())
                    .documentType("CCCD")
                    .documentNumber(mainGuest.getIdNumber())
                    .isPrimaryGuest(true)
                    .isChild(false)
                    .checkInAt(booking.getCheckedInAt() != null ? booking.getCheckedInAt() : LocalDateTime.now())
                    .build();
            roomStayGuestRepository.save(primary);
        }

        RoomType roomType = booking.getRoomType();
        int maxCap = roomType != null && roomType.getMaxCapacity() != null ? roomType.getMaxCapacity() : 2;

        long currentStayingCount = roomStayGuestRepository.countByBookingIdAndLeftEarlyAtIsNull(bookingId);

        if (currentStayingCount >= maxCap) {
            long remaining = Math.max(0, maxCap - currentStayingCount);
            throw new IllegalArgumentException("Phòng đã đạt sức chứa tối đa (" + maxCap
                    + " người). Số khách có thể thêm tối đa là " + remaining + " người!");
        }

        // Kiểm tra độ tuổi trẻ em
        boolean isChild = Boolean.TRUE.equals(dto.getIsChild());
        int maxChildAge = roomType != null && roomType.getMaxChildAgeFree() != null ? roomType.getMaxChildAgeFree() : 6;
        if (dto.getBirthYear() != null) {
            int age = Year.now().getValue() - dto.getBirthYear();
            if (age <= maxChildAge) {
                isChild = true;
            }
        }

        RoomStayGuest coOccupant = RoomStayGuest.builder()
                .booking(booking)
                .fullName(dto.getFullName().trim())
                .birthYear(dto.getBirthYear())
                .documentType(dto.getDocumentType() != null ? dto.getDocumentType() : "CCCD")
                .documentNumber(dto.getDocumentNumber() != null ? dto.getDocumentNumber().trim() : null)
                .isChild(isChild)
                .isPrimaryGuest(false)
                .checkInAt(LocalDateTime.now())
                .build();

        coOccupant = roomStayGuestRepository.save(coOccupant);

        // Tính toán phụ thu vượt ngưỡng sức chứa tiêu chuẩn
        SurchargeCalculationResult result = recalculateBookingPriceAndSurcharges(booking, actor);

        String surchargeNotice = "";
        if (result.chargeableExtraGuests() > 0) {
            surchargeNotice = ". Phụ thu vượt tiêu chuẩn " + result.chargeableExtraGuests() + " người: +"
                    + result.extraChargePerNight().stripTrailingZeros().toPlainString() + " đ/đêm (Tổng phụ thu: "
                    + result.totalExtraCharge().stripTrailingZeros().toPlainString() + " đ)";
        }

        auditLogService.log("RoomStayGuest", coOccupant.getId(), "ADD_CO_OCCUPANT", actor,
                "Lễ tân " + actor.getName() + " thêm khách cùng phòng: " + coOccupant.getFullName()
                + " (" + (coOccupant.getIsChild() ? "Trẻ em" : "Người lớn") + ") vào phòng "
                + (booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "")
                + " (Booking #" + booking.getId() + ")" + surchargeNotice);

        return toDto(coOccupant, true);
    }

    @Override
    @Transactional
    public RoomStayGuestResponseDto markLeftEarly(Long bookingId, Long guestId, User actor) {
        RoomStayGuest guest = roomStayGuestRepository.findById(guestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách cùng phòng #" + guestId));

        if (!guest.getBooking().getId().equals(bookingId)) {
            throw new IllegalArgumentException("Khách này không thuộc đặt phòng #" + bookingId);
        }

        if (guest.getLeftEarlyAt() != null) {
            throw new IllegalArgumentException("Khách đã được đánh dấu rời sớm trước đó lúc " + guest.getLeftEarlyAt());
        }

        guest.setLeftEarlyAt(LocalDateTime.now());
        guest = roomStayGuestRepository.save(guest);

        Booking booking = guest.getBooking();
        SurchargeCalculationResult result = recalculateBookingPriceAndSurcharges(booking, actor);

        auditLogService.log("RoomStayGuest", guest.getId(), "MARK_LEFT_EARLY", actor,
                "Lễ tân " + actor.getName() + " đánh dấu khách " + guest.getFullName()
                + " rời phòng sớm lúc " + guest.getLeftEarlyAt() + " (Booking #" + bookingId + ")"
                + (result.totalExtraCharge().compareTo(BigDecimal.ZERO) > 0 
                        ? ". Phụ thu sau cập nhật: " + result.totalExtraCharge().stripTrailingZeros().toPlainString() + " đ" 
                        : ". Không còn phụ thu vượt tiêu chuẩn"));

        return toDto(guest, true);
    }

    @Override
    @Transactional
    public void removeStayingGuest(Long bookingId, Long guestId, User actor) {
        RoomStayGuest guest = roomStayGuestRepository.findById(guestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách cùng phòng #" + guestId));

        if (!guest.getBooking().getId().equals(bookingId)) {
            throw new IllegalArgumentException("Khách này không thuộc đặt phòng #" + bookingId);
        }

        // Quy tắc bảo toàn dữ liệu lưu trú: Không cho xóa người đã nằm trong tờ khai lưu trú đã xuất
        if (Boolean.TRUE.equals(guest.getIsExported())) {
            throw new IllegalArgumentException("Không thể xóa khách này vì đã nằm trong bản khai báo lưu trú đã kết xuất tới cơ quan quản lý! Vui lòng sử dụng tính năng 'Đánh dấu rời sớm'.");
        }

        if (Boolean.TRUE.equals(guest.getIsPrimaryGuest())) {
            throw new IllegalArgumentException("Không thể xóa người đứng tên chính của đặt phòng!");
        }

        Booking booking = guest.getBooking();
        roomStayGuestRepository.delete(guest);

        SurchargeCalculationResult result = recalculateBookingPriceAndSurcharges(booking, actor);

        auditLogService.log("RoomStayGuest", guestId, "REMOVE_CO_OCCUPANT", actor,
                "Lễ tân " + actor.getName() + " đã xóa khách cùng phòng: " + guest.getFullName()
                + " khỏi Booking #" + bookingId
                + (result.totalExtraCharge().compareTo(BigDecimal.ZERO) > 0 
                        ? ". Phụ thu sau cập nhật: " + result.totalExtraCharge().stripTrailingZeros().toPlainString() + " đ" 
                        : ". Không còn phụ thu vượt tiêu chuẩn"));
    }

    @Override
    @Transactional
    public void syncBookingSurcharges(Long bookingId, User actor) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking != null) {
            recalculateBookingPriceAndSurcharges(booking, actor);
        }
    }

    private SurchargeCalculationResult recalculateBookingPriceAndSurcharges(Booking booking, User actor) {
        RoomType roomType = booking.getRoomType();
        if (roomType == null) {
            BigDecimal cur = booking.getActualPrice() != null ? booking.getActualPrice() : BigDecimal.ZERO;
            return new SurchargeCalculationResult(0, 0, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, cur, cur);
        }

        long nights = ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate());
        if (nights <= 0) nights = 1;

        List<RoomStayGuest> activeGuests = roomStayGuestRepository.findByBookingIdOrderByCreatedAtAsc(booking.getId())
                .stream()
                .filter(g -> g.getLeftEarlyAt() == null)
                .toList();

        int totalStaying = activeGuests.size();
        int stdCap = roomType.getStandardCapacity() != null ? roomType.getStandardCapacity() : 2;
        int maxChildAge = roomType.getMaxChildAgeFree() != null ? roomType.getMaxChildAgeFree() : 6;

        int childCount = (int) activeGuests.stream()
                .filter(g -> Boolean.TRUE.equals(g.getIsChild()) ||
                        (g.getBirthYear() != null && (Year.now().getValue() - g.getBirthYear() <= maxChildAge)))
                .count();

        int extraGuests = Math.max(0, totalStaying - stdCap);
        int freeChildren = Math.min(childCount, extraGuests);
        int chargeableExtraGuests = Math.max(0, extraGuests - freeChildren);

        BigDecimal extraRate = roomType.getExtraPersonChargePerNight() != null
                ? roomType.getExtraPersonChargePerNight() : BigDecimal.ZERO;
        BigDecimal extraChargePerNight = extraRate.multiply(BigDecimal.valueOf(chargeableExtraGuests));
        BigDecimal totalExtraCharge = extraChargePerNight.multiply(BigDecimal.valueOf(nights));

        BigDecimal baseRoomPrice = pricingService.calculateTotalPrice(
                roomType, booking.getCheckInDate(), booking.getCheckOutDate());
        BigDecimal newActualPrice = baseRoomPrice.add(totalExtraCharge);

        // actualPrice của booking trước khi hoàn tất lưu trữ biểu thị tiền phòng thuần
        booking.setActualPrice(baseRoomPrice);

        // Đồng bộ dòng dịch vụ phụ thu người ở ghép vào booking_service_usages
        ExtraService surchargeService = extraServiceRepository.findAll().stream()
                .filter(s -> s.getName().equals("Phụ thu người ở ghép") || s.getName().equals("Phụ thu người ở ghép vượt tiêu chuẩn"))
                .findFirst()
                .orElseGet(() -> extraServiceRepository.save(ExtraService.builder()
                        .name("Phụ thu người ở ghép")
                        .description("Phụ thu lưu trú cho người ở ghép vượt quá sức chứa tiêu chuẩn của loại phòng")
                        .unit("người/đêm")
                        .unitPrice(extraRate.compareTo(BigDecimal.ZERO) > 0 ? extraRate : BigDecimal.ZERO)
                        .active(true)
                        .build()));

        List<BookingServiceUsage> usages = bookingServiceUsageRepository.findByBookingId(booking.getId());
        BookingServiceUsage surchargeUsage = usages.stream()
                .filter(u -> Boolean.TRUE.equals(u.getIsSystemMandatory())
                        || (u.getExtraService() != null && u.getExtraService().getId().equals(surchargeService.getId())))
                .findFirst()
                .orElse(null);

        if (chargeableExtraGuests > 0 && extraRate.compareTo(BigDecimal.ZERO) > 0) {
            int quantity = (int) (chargeableExtraGuests * nights);
            String usageNote = "Phụ thu " + chargeableExtraGuests + " người vượt tiêu chuẩn x " + nights + " đêm";

            if (surchargeUsage == null) {
                surchargeUsage = BookingServiceUsage.builder()
                        .booking(booking)
                        .extraService(surchargeService)
                        .quantity(quantity)
                        .unitPriceSnapshot(extraRate)
                        .note(usageNote)
                        .isSystemMandatory(true)
                        .build();
                bookingServiceUsageRepository.save(surchargeUsage);
            } else {
                surchargeUsage.setQuantity(quantity);
                surchargeUsage.setUnitPriceSnapshot(extraRate);
                surchargeUsage.setNote(usageNote);
                surchargeUsage.setIsSystemMandatory(true);
                bookingServiceUsageRepository.save(surchargeUsage);
            }
        } else {
            if (surchargeUsage != null) {
                bookingServiceUsageRepository.delete(surchargeUsage);
            }
        }

        // Cập nhật ghi chú phụ thu
        String currentNote = booking.getNote() != null ? booking.getNote() : "";
        String cleanedNote = currentNote.replaceAll("\\[Phụ thu.*?\\]", "").trim();
        if (chargeableExtraGuests > 0 && extraRate.compareTo(BigDecimal.ZERO) > 0) {
            String surchargeTag = "[Phụ thu vượt tiêu chuẩn: " + chargeableExtraGuests + " người ("
                    + extraRate.stripTrailingZeros().toPlainString() + " đ/người/đêm x " + nights + " đêm = "
                    + totalExtraCharge.stripTrailingZeros().toPlainString() + " đ)]";
            cleanedNote = cleanedNote.isEmpty() ? surchargeTag : (cleanedNote + "\n" + surchargeTag);
        }
        booking.setNote(cleanedNote);
        bookingRepository.save(booking);

        // Cập nhật hóa đơn PENDING nếu có
        Invoice pendingInvoice = invoiceRepository.findByBookingId(booking.getId()).orElse(null);
        if (pendingInvoice != null && (pendingInvoice.getStatus() == InvoiceStatus.PENDING
                || pendingInvoice.getStatus() == InvoiceStatus.PENDING_PAYMENT
                || pendingInvoice.getStatus() == InvoiceStatus.DRAFT)) {
            pendingInvoice.setRoomAmount(baseRoomPrice);
            
            // Tính lại tổng tiền dịch vụ (đã gồm dòng phụ thu người ở ghép)
            List<BookingServiceUsage> currentUsages = bookingServiceUsageRepository.findByBookingId(booking.getId());
            BigDecimal serviceAmt = currentUsages.stream()
                    .map(u -> u.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(u.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            pendingInvoice.setServiceAmount(serviceAmt);
            BigDecimal discountAmt = pendingInvoice.getDiscountAmount() != null ? pendingInvoice.getDiscountAmount() : BigDecimal.ZERO;
            pendingInvoice.setTotalAmount(baseRoomPrice.add(serviceAmt).subtract(discountAmt));
            invoiceRepository.save(pendingInvoice);
        }

        return new SurchargeCalculationResult(totalStaying, extraGuests, childCount, chargeableExtraGuests, extraChargePerNight, totalExtraCharge, baseRoomPrice, newActualPrice);
    }

    private RoomStayGuestResponseDto toDto(RoomStayGuest g, boolean canViewFullDocs) {
        String docNum = g.getDocumentNumber();
        if (!canViewFullDocs && docNum != null && docNum.length() > 4) {
            docNum = docNum.substring(0, docNum.length() - 4).replaceAll(".", "*") + docNum.substring(docNum.length() - 4);
        }

        return RoomStayGuestResponseDto.builder()
                .id(g.getId())
                .bookingId(g.getBooking().getId())
                .fullName(g.getFullName())
                .birthYear(g.getBirthYear())
                .documentType(g.getDocumentType())
                .documentNumber(docNum)
                .isChild(g.getIsChild())
                .isPrimaryGuest(g.getIsPrimaryGuest())
                .checkInAt(g.getCheckInAt())
                .leftEarlyAt(g.getLeftEarlyAt())
                .isExported(g.getIsExported())
                .isCurrentlyStaying(g.getLeftEarlyAt() == null)
                .build();
    }
}
