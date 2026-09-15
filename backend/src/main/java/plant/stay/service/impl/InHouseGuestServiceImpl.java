package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.InHouseFilterOptionsResponse;
import plant.stay.dto.response.InHouseGuestResponse;
import plant.stay.dto.response.InHouseSummaryResponse;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.InHouseGuestService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class InHouseGuestServiceImpl implements InHouseGuestService {

    private final BookingRepository bookingRepository;
    private final RoomStayGuestRepository roomStayGuestRepository;
    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final DepositRepository depositRepository;
    private final BookingServiceUsageRepository usageRepository;

    @Override
    @Transactional(readOnly = true)
    public List<InHouseGuestResponse> getInHouseGuests(User actor) {
        List<Booking> inHouseBookings = bookingRepository.findInHouseBookings();
        LocalDate today = LocalDate.now();

        List<InHouseGuestResponse> result = new ArrayList<>();

        for (Booking booking : inHouseBookings) {
            Room room = booking.getRoom();
            RoomType roomType = booking.getRoomType();
            Guest primaryGuest = booking.getGuest();

            // 1. Số lượng người thực tế trong phòng (đồng bộ theo RoomStayGuest nếu có)
            int standardCapacity = roomType != null && roomType.getStandardCapacity() != null ? roomType.getStandardCapacity() : 2;
            int maxCapacity = roomType != null && roomType.getMaxCapacity() != null ? roomType.getMaxCapacity() : 2;
            int occupantCount = 1;

            try {
                long activeStayCount = roomStayGuestRepository.countByBookingIdAndLeftEarlyAtIsNull(booking.getId());
                if (activeStayCount > 0) {
                    occupantCount = (int) activeStayCount;
                } else if (booking.getStayingGuests() != null && !booking.getStayingGuests().isEmpty()) {
                    occupantCount = Math.max(1, booking.getStayingGuests().size());
                }
            } catch (Exception e) {
                log.warn("Lỗi kiểm tra số lượng khách lưu trú booking #{}", booking.getId(), e);
            }

            // 2. Tính tiền phòng và dịch vụ phát sinh
            BigDecimal roomAmount = booking.getActualPrice() != null
                    ? booking.getActualPrice()
                    : (booking.getExpectedPrice() != null ? booking.getExpectedPrice() : BigDecimal.ZERO);

            BigDecimal serviceAmount = BigDecimal.ZERO;
            try {
                List<BookingServiceUsage> usages = usageRepository.findByBookingId(booking.getId());
                serviceAmount = usages.stream()
                        .map(u -> (u.getUnitPriceSnapshot() != null ? u.getUnitPriceSnapshot() : BigDecimal.ZERO)
                                .multiply(BigDecimal.valueOf(u.getQuantity() != null ? u.getQuantity() : 1)))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            } catch (Exception e) {
                log.warn("Lỗi tính tiền dịch vụ booking #{}", booking.getId(), e);
            }

            BigDecimal incurredAmount = roomAmount.add(serviceAmount);

            // 3. Tính số tiền đã thanh toán / tiền cọc
            BigDecimal paidAmount = BigDecimal.ZERO;
            Invoice invoice = null;
            try {
                invoice = invoiceRepository.findInvoicesCoveringBooking(booking.getId()).stream().findFirst().orElse(null);
                if (invoice != null) {
                    List<Payment> payments = paymentRepository.findByInvoiceId(invoice.getId());
                    paidAmount = payments.stream()
                            .map(Payment::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                }
            } catch (Exception e) {
                log.warn("Lỗi kiểm tra hóa đơn booking #{}", booking.getId(), e);
            }

            // Nếu chưa có hóa đơn hoặc hóa đơn chưa ghi nhận tiền cọc, kiểm tra bảng Deposit
            BigDecimal effectiveDeposit = BigDecimal.ZERO;
            try {
                List<Deposit> deposits = depositRepository.findByBookingIdOrderByCreatedAtDesc(booking.getId());
                for (Deposit d : deposits) {
                    if (d.getStatus() == DepositStatus.COLLECTED || d.getStatus() == DepositStatus.SHORT_PAID) {
                        BigDecimal collected = d.getCollectedAmount() != null ? d.getCollectedAmount() : BigDecimal.ZERO;
                        BigDecimal refunded = d.getRefundedAmount() != null ? d.getRefundedAmount() : BigDecimal.ZERO;
                        BigDecimal netDeposit = collected.subtract(refunded);
                        if (netDeposit.compareTo(BigDecimal.ZERO) > 0) {
                            effectiveDeposit = effectiveDeposit.add(netDeposit);
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Lỗi kiểm tra tiền cọc booking #{}", booking.getId(), e);
            }

            // Đảm bảo số tiền đã thu không nhỏ hơn số tiền cọc thực tế
            if (paidAmount.compareTo(effectiveDeposit) < 0) {
                paidAmount = effectiveDeposit;
            }

            // 4. Tính toán số tiền nợ & trạng thái thanh toán
            BigDecimal remainingAmount = incurredAmount.subtract(paidAmount);
            if (remainingAmount.compareTo(BigDecimal.ZERO) < 0) {
                remainingAmount = BigDecimal.ZERO;
            }

            boolean hasDebt = remainingAmount.compareTo(BigDecimal.ZERO) > 0;
            String paymentStatus;
            if (!hasDebt) {
                paymentStatus = "PAID";
            } else if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
                paymentStatus = "PARTIALLY_PAID";
            } else {
                paymentStatus = "UNPAID";
            }

            boolean isCheckingOutToday = booking.getCheckOutDate() != null && booking.getCheckOutDate().equals(today);

            InHouseGuestResponse item = InHouseGuestResponse.builder()
                    .bookingId(booking.getId())
                    .roomId(room != null ? room.getId() : null)
                    .roomNumber(room != null ? room.getRoomNumber() : "Chưa gán")
                    .floor(room != null && room.getFloor() != null ? room.getFloor() : "")
                    .roomTypeId(roomType != null ? roomType.getId() : null)
                    .roomTypeName(roomType != null ? roomType.getName() : "")
                    .primaryGuestId(primaryGuest != null ? primaryGuest.getId() : null)
                    .primaryGuestName(primaryGuest != null ? primaryGuest.getName() : "Không xác định")
                    .guestPhone(primaryGuest != null ? primaryGuest.getPhone() : "")
                    .occupantCount(occupantCount)
                    .standardCapacity(standardCapacity)
                    .maxCapacity(maxCapacity)
                    .checkInDate(booking.getCheckInDate())
                    .checkedInAt(booking.getCheckedInAt())
                    .expectedCheckOutDate(booking.getCheckOutDate())
                    .checkingOutToday(isCheckingOutToday)
                    .roomAmount(roomAmount)
                    .serviceAmount(serviceAmount)
                    .incurredAmount(incurredAmount)
                    .paidAmount(paidAmount)
                    .remainingAmount(remainingAmount)
                    .hasDebt(hasDebt)
                    .paymentStatus(paymentStatus)
                    .specialRequests(booking.getNote())
                    .build();

            result.add(item);
        }

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<InHouseGuestResponse> getInHouseGuests(User actor, String floor, Long roomTypeId, Boolean checkingOutToday, Boolean hasDebt, String search) {
        List<InHouseGuestResponse> all = getInHouseGuests(actor);

        return all.stream()
                .filter(g -> {
                    // Lọc tầng
                    if (floor != null && !floor.isBlank() && !floor.equalsIgnoreCase("ALL")) {
                        if (g.getFloor() == null || !g.getFloor().trim().equalsIgnoreCase(floor.trim())) {
                            return false;
                        }
                    }

                    // Lọc loại phòng
                    if (roomTypeId != null) {
                        if (g.getRoomTypeId() == null || !g.getRoomTypeId().equals(roomTypeId)) {
                            return false;
                        }
                    }

                    // Lọc trả phòng hôm nay
                    if (checkingOutToday != null && checkingOutToday) {
                        if (!g.isCheckingOutToday()) {
                            return false;
                        }
                    }

                    // Lọc theo tình trạng còn nợ
                    if (hasDebt != null) {
                        if (hasDebt && !g.isHasDebt()) {
                            return false;
                        }
                        if (!hasDebt && g.isHasDebt()) {
                            return false;
                        }
                    }

                    // Tìm kiếm từ khóa: phòng, tên khách, số điện thoại, ghi chú
                    if (search != null && !search.isBlank()) {
                        String q = search.trim().toLowerCase();
                        boolean matchRoom = g.getRoomNumber() != null && g.getRoomNumber().toLowerCase().contains(q);
                        boolean matchGuest = g.getPrimaryGuestName() != null && g.getPrimaryGuestName().toLowerCase().contains(q);
                        boolean matchPhone = g.getGuestPhone() != null && g.getGuestPhone().toLowerCase().contains(q);
                        boolean matchReq = g.getSpecialRequests() != null && g.getSpecialRequests().toLowerCase().contains(q);
                        if (!matchRoom && !matchGuest && !matchPhone && !matchReq) {
                            return false;
                        }
                    }

                    return true;
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public InHouseFilterOptionsResponse getFilterOptions() {
        List<String> distinctFloors = roomRepository.findDistinctFloors();
        List<RoomType> activeTypes = roomTypeRepository.findByActiveTrue();

        List<InHouseFilterOptionsResponse.RoomTypeOption> typeOptions = activeTypes.stream()
                .map(t -> new InHouseFilterOptionsResponse.RoomTypeOption(t.getId(), t.getName()))
                .toList();

        return InHouseFilterOptionsResponse.builder()
                .floors(distinctFloors != null ? distinctFloors : List.of())
                .roomTypes(typeOptions)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public InHouseSummaryResponse getSummary(User actor) {
        List<InHouseGuestResponse> all = getInHouseGuests(actor);
        int totalRooms = all.size();
        int totalOccupants = all.stream().mapToInt(InHouseGuestResponse::getOccupantCount).sum();
        int checkoutToday = (int) all.stream().filter(InHouseGuestResponse::isCheckingOutToday).count();
        int debtCount = (int) all.stream().filter(InHouseGuestResponse::isHasDebt).count();
        BigDecimal totalDebt = all.stream()
                .filter(InHouseGuestResponse::isHasDebt)
                .map(InHouseGuestResponse::getRemainingAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return InHouseSummaryResponse.builder()
                .totalRooms(totalRooms)
                .totalOccupants(totalOccupants)
                .checkoutTodayCount(checkoutToday)
                .debtCount(debtCount)
                .totalDebtAmount(totalDebt)
                .build();
    }
}
