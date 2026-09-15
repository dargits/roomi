package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Booking;
import plant.stay.model.DepositStatus;
import plant.stay.model.Role;
import plant.stay.model.RoomStatus;
import plant.stay.model.User;
import plant.stay.model.Invoice;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.DepositRepository;
import plant.stay.repository.InvoiceRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.util.AuthUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/reports")
@CrossOrigin("*")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportController {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final InvoiceRepository invoiceRepository;
    private final DepositRepository depositRepository;
    private final plant.stay.repository.PaymentRepository paymentRepository;
    private final plant.stay.repository.RoomTypeRepository roomTypeRepository;
    private final AuthUtil authUtil;

    /**
     * Tính toán doanh thu thực tế của booking một cách an toàn:
     * Ưu tiên actualPrice > Invoice totalAmount > expectedPrice
     */
    private BigDecimal getEffectiveRevenue(Booking b) {
        if (b == null) return BigDecimal.ZERO;
        if (b.getActualPrice() != null && b.getActualPrice().compareTo(BigDecimal.ZERO) > 0) {
            return b.getActualPrice();
        }
        try {
            Optional<Invoice> invOpt = invoiceRepository.findByBookingId(b.getId());
            if (invOpt.isPresent() && invOpt.get().getTotalAmount() != null && invOpt.get().getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
                return invOpt.get().getTotalAmount();
            }
        } catch (Exception ignored) {}
        if (b.getExpectedPrice() != null && b.getExpectedPrice().compareTo(BigDecimal.ZERO) > 0) {
            return b.getExpectedPrice();
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal getBookingPaidAmount(Booking b) {
        if (b == null) return BigDecimal.ZERO;
        try {
            Optional<Invoice> invOpt = invoiceRepository.findByBookingId(b.getId());
            if (invOpt.isPresent()) {
                return paymentRepository.findByInvoiceId(invOpt.get().getId()).stream()
                        .map(plant.stay.model.Payment::getAmount)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }
        } catch (Exception ignored) {}
        return getEffectiveRevenue(b);
    }

    // ========================
    // Dashboard tổng quan
    // ========================
    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(HttpServletRequest request) {
        checkOwner(request);
        LocalDate today = LocalDate.now();

        // Thống kê phòng theo trạng thái
        long totalRooms = roomRepository.count();
        long availableRooms = roomRepository.countByStatus(RoomStatus.AVAILABLE);
        long occupiedRooms  = roomRepository.countByStatus(RoomStatus.OCCUPIED);
        long dirtyRooms     = roomRepository.countByStatus(RoomStatus.DIRTY);
        long maintenanceRooms = roomRepository.countByStatus(RoomStatus.MAINTENANCE);

        // Booking hôm nay
        List<Booking> todayBookings = bookingRepository.findTodayCheckinCheckout(today);
        long todayCheckIns  = todayBookings.stream().filter(b -> b.getCheckInDate() != null && b.getCheckInDate().equals(today)).count();
        long todayCheckOuts = todayBookings.stream().filter(b -> b.getCheckOutDate() != null && b.getCheckOutDate().equals(today)).count();

        // Doanh thu tháng (chỉ từ booking đã CHECKED_OUT trong tháng)
        LocalDate firstOfMonth = today.withDayOfMonth(1);
        List<Booking> monthBookings = bookingRepository.findCheckedOutBetween(firstOfMonth, today);
        BigDecimal monthRevenue = monthBookings.stream()
                .map(this::getEffectiveRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal monthCollected = monthBookings.stream()
                .map(this::getBookingPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal monthDebt = monthRevenue.subtract(monthCollected).max(BigDecimal.ZERO);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRooms", totalRooms);
        result.put("availableRooms", availableRooms);
        result.put("occupiedRooms", occupiedRooms);
        result.put("dirtyRooms", dirtyRooms);
        result.put("maintenanceRooms", maintenanceRooms);
        result.put("todayCheckIns", todayCheckIns);
        result.put("todayCheckOuts", todayCheckOuts);
        result.put("todayBookings", todayBookings.size());
        result.put("monthRevenue", monthRevenue);
        result.put("monthCollectedRevenue", monthCollected);
        result.put("monthDebtRevenue", monthDebt);

        return ResponseEntity.ok(result);
    }

    // ========================
    // Báo cáo doanh thu
    // ========================
    @GetMapping("/revenue")
    public ResponseEntity<?> revenue(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "day") String groupBy,
            HttpServletRequest request) {
        checkFinance(request);
        List<Booking> bookings = bookingRepository.findCheckedOutBetween(from, to);

        BigDecimal totalRevenue = bookings.stream()
                .map(this::getEffectiveRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCollected = bookings.stream()
                .map(this::getBookingPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDebt = totalRevenue.subtract(totalCollected).max(BigDecimal.ZERO);
        int bookingCount = bookings.size();

        // Tạo rows chi tiết theo ngày hoặc tháng
        List<Map<String, Object>> rows;
        if ("month".equalsIgnoreCase(groupBy)) {
            // Group by month: YYYY-MM
            Map<String, List<Booking>> grouped = bookings.stream()
                    .filter(b -> b.getCheckOutDate() != null)
                    .collect(Collectors.groupingBy(b ->
                            b.getCheckOutDate().format(DateTimeFormatter.ofPattern("yyyy-MM"))));
            rows = grouped.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .map(e -> {
                        BigDecimal rev = e.getValue().stream()
                                .map(this::getEffectiveRevenue)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        BigDecimal collected = e.getValue().stream()
                                .map(this::getBookingPaidAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        BigDecimal debt = rev.subtract(collected).max(BigDecimal.ZERO);
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("period", e.getKey());
                        row.put("bookings", e.getValue().size());
                        row.put("revenue", rev);
                        row.put("collectedRevenue", collected);
                        row.put("debtRevenue", debt);
                        return row;
                    })
                    .collect(Collectors.toList());
        } else {
            // Group by day: YYYY-MM-DD
            Map<LocalDate, List<Booking>> grouped = bookings.stream()
                    .filter(b -> b.getCheckOutDate() != null)
                    .collect(Collectors.groupingBy(Booking::getCheckOutDate));
            rows = grouped.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .map(e -> {
                        BigDecimal rev = e.getValue().stream()
                                .map(this::getEffectiveRevenue)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        BigDecimal collected = e.getValue().stream()
                                .map(this::getBookingPaidAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        BigDecimal debt = rev.subtract(collected).max(BigDecimal.ZERO);
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("period", e.getKey().toString());
                        row.put("bookings", e.getValue().size());
                        row.put("revenue", rev);
                        row.put("collectedRevenue", collected);
                        row.put("debtRevenue", debt);
                        return row;
                    })
                    .collect(Collectors.toList());
        }

        // Tính phí hủy/cọc phạt trong kỳ (FORFEITED và PARTIALLY_REFUNDED)
        java.util.List<plant.stay.model.DepositStatus> penaltyStatuses =
                java.util.List.of(DepositStatus.FORFEITED, DepositStatus.PARTIALLY_REFUNDED);
        java.util.List<plant.stay.model.Deposit> penaltyDeposits =
                depositRepository.findPenaltyDepositsBetween(penaltyStatuses, from, to);
        BigDecimal penaltyRevenue = penaltyDeposits.stream()
                .map(d -> d.getPenaltyAmount() != null ? d.getPenaltyAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal grandTotal = totalRevenue.add(penaltyRevenue);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from.toString());
        result.put("to", to.toString());
        result.put("groupBy", groupBy);
        result.put("totalRevenue", totalRevenue);
        result.put("collectedRevenue", totalCollected);
        result.put("debtRevenue", totalDebt);
        result.put("penaltyRevenue", penaltyRevenue);
        result.put("grandTotal", grandTotal);
        result.put("bookingCount", bookingCount);
        result.put("rows", rows);

        return ResponseEntity.ok(result);
    }

    // ========================
    // Báo cáo công suất phòng
    // ========================
    @GetMapping("/occupancy")
    public ResponseEntity<?> occupancy(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletRequest request) {
        checkOwner(request);
        long totalRooms = roomRepository.count();
        List<Booking> bookings = bookingRepository.findForCalendar(from, to);
        long days = Math.max(0, ChronoUnit.DAYS.between(from, to));

        long occupiedRoomDays = bookings.stream()
                .filter(b -> b.getRoom() != null && b.getCheckInDate() != null && b.getCheckOutDate() != null)
                .mapToLong(b -> {
                    LocalDate start = b.getCheckInDate().isBefore(from) ? from : b.getCheckInDate();
                    LocalDate end = b.getCheckOutDate().isAfter(to) ? to : b.getCheckOutDate();
                    return Math.max(0, ChronoUnit.DAYS.between(start, end));
                }).sum();

        double occupancyRate = totalRooms * days > 0
                ? (double) occupiedRoomDays / (totalRooms * days) * 100
                : 0;

        // Tạo rows theo từng ngày trong khoảng
        List<Map<String, Object>> rows = new ArrayList<>();
        for (long i = 0; i < days; i++) {
            LocalDate day = from.plusDays(i);
            // Đếm số phòng có booking active ngày đó
            long bookedThisDay = bookings.stream()
                    .filter(b -> b.getRoom() != null && b.getCheckInDate() != null && b.getCheckOutDate() != null)
                    .filter(b -> !b.getCheckInDate().isAfter(day) && b.getCheckOutDate().isAfter(day))
                    .count();
            double dayRate = totalRooms > 0 ? (double) bookedThisDay / totalRooms * 100 : 0;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", day.toString());
            row.put("availableRooms", totalRooms);
            row.put("occupiedRooms", bookedThisDay);
            row.put("occupancyRate", Math.round(dayRate * 100.0) / 100.0);
            rows.add(row);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from.toString());
        result.put("to", to.toString());
        result.put("totalRooms", totalRooms);
        result.put("totalRoomNights", occupiedRoomDays);
        result.put("occupancyRate", Math.round(occupancyRate * 100.0) / 100.0);
        result.put("rows", rows);

        return ResponseEntity.ok(result);
    }

    // ========================================================
    // Báo cáo Giá bán trung bình (ADR) và Doanh thu/phòng (RevPAR)
    // ========================================================
    @GetMapping("/adr-revpar")
    public ResponseEntity<?> adrRevpar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "day") String groupBy,
            HttpServletRequest request) {
        checkFinance(request);

        List<Booking> bookings = bookingRepository.findCheckedOutBetween(from, to);
        if (bookings == null) bookings = Collections.emptyList();

        List<plant.stay.model.Room> allRooms = roomRepository.findAllWithRoomType();
        if (allRooms == null) allRooms = Collections.emptyList();

        List<plant.stay.model.RoomType> allRoomTypes = roomTypeRepository.findAll();
        if (allRoomTypes == null) allRoomTypes = Collections.emptyList();

        long totalRoomsCount = allRooms.size();
        long daysInRange = Math.max(1, ChronoUnit.DAYS.between(from, to) + 1);
        long totalAvailableRoomNights = totalRoomsCount * daysInRange;

        // Tổng doanh thu và đêm phòng
        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalSoldNights = 0;

        for (Booking b : bookings) {
            BigDecimal rev = getEffectiveRevenue(b);
            totalRevenue = totalRevenue.add(rev != null ? rev : BigDecimal.ZERO);
            long nights = 1;
            if (b.getCheckInDate() != null && b.getCheckOutDate() != null) {
                nights = Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()));
            }
            totalSoldNights += nights;
        }

        BigDecimal overallAdr = totalSoldNights > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalSoldNights), 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal overallRevpar = totalAvailableRoomNights > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalAvailableRoomNights), 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        double overallOccupancyRate = totalAvailableRoomNights > 0
                ? Math.round(((double) totalSoldNights / totalAvailableRoomNights * 100.0) * 100.0) / 100.0
                : 0.0;

        // 1. Phân rã theo mốc thời gian (Timeline: day hoặc month)
        List<Map<String, Object>> timelineRows = new ArrayList<>();
        if ("month".equalsIgnoreCase(groupBy)) {
            Map<String, List<Booking>> grouped = bookings.stream()
                    .filter(b -> b.getCheckOutDate() != null)
                    .collect(Collectors.groupingBy(b ->
                            b.getCheckOutDate().format(DateTimeFormatter.ofPattern("yyyy-MM"))));
            timelineRows = grouped.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .map(e -> {
                        String periodStr = e.getKey();
                        List<Booking> bList = e.getValue() != null ? e.getValue() : Collections.emptyList();
                        BigDecimal rev = bList.stream()
                                .map(this::getEffectiveRevenue)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        long soldNights = bList.stream()
                                .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                                        ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                                        : 1)
                                .sum();

                        java.time.YearMonth ym = java.time.YearMonth.parse(periodStr);
                        LocalDate monthStart = ym.atDay(1).isBefore(from) ? from : ym.atDay(1);
                        LocalDate monthEnd = ym.atEndOfMonth().isAfter(to) ? to : ym.atEndOfMonth();
                        long periodDays = Math.max(1, ChronoUnit.DAYS.between(monthStart, monthEnd) + 1);
                        long availNights = totalRoomsCount * periodDays;

                        BigDecimal adr = soldNights > 0
                                ? rev.divide(BigDecimal.valueOf(soldNights), 2, java.math.RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                        BigDecimal revpar = availNights > 0
                                ? rev.divide(BigDecimal.valueOf(availNights), 2, java.math.RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                        double occRate = availNights > 0
                                ? Math.round(((double) soldNights / availNights * 100.0) * 100.0) / 100.0
                                : 0.0;

                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("period", periodStr);
                        row.put("bookings", bList.size());
                        row.put("revenue", rev);
                        row.put("soldNights", soldNights);
                        row.put("availableNights", availNights);
                        row.put("occupancyRate", occRate);
                        row.put("adr", adr);
                        row.put("revpar", revpar);
                        return row;
                    })
                    .collect(Collectors.toList());
        } else {
            // Theo ngày
            Map<LocalDate, List<Booking>> grouped = bookings.stream()
                    .filter(b -> b.getCheckOutDate() != null)
                    .collect(Collectors.groupingBy(Booking::getCheckOutDate));
            timelineRows = grouped.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .map(e -> {
                        LocalDate d = e.getKey();
                        List<Booking> bList = e.getValue() != null ? e.getValue() : Collections.emptyList();
                        BigDecimal rev = bList.stream()
                                .map(this::getEffectiveRevenue)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        long soldNights = bList.stream()
                                .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                                        ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                                        : 1)
                                .sum();
                        long availNights = totalRoomsCount;

                        BigDecimal adr = soldNights > 0
                                ? rev.divide(BigDecimal.valueOf(soldNights), 2, java.math.RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                        BigDecimal revpar = availNights > 0
                                ? rev.divide(BigDecimal.valueOf(availNights), 2, java.math.RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                        double occRate = availNights > 0
                                ? Math.round(((double) soldNights / availNights * 100.0) * 100.0) / 100.0
                                : 0.0;

                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("period", d.toString());
                        row.put("bookings", bList.size());
                        row.put("revenue", rev);
                        row.put("soldNights", soldNights);
                        row.put("availableNights", availNights);
                        row.put("occupancyRate", occRate);
                        row.put("adr", adr);
                        row.put("revpar", revpar);
                        return row;
                    })
                    .collect(Collectors.toList());
        }

        // 2. Phân rã theo Loại phòng (Room Type)
        List<Map<String, Object>> roomTypeRows = new ArrayList<>();
        final BigDecimal finalTotalRevenue = totalRevenue;
        for (plant.stay.model.RoomType rt : allRoomTypes) {
            long rtRoomsCount = allRooms.stream()
                    .filter(r -> r.getRoomType() != null && r.getRoomType().getId() != null && r.getRoomType().getId().equals(rt.getId()))
                    .count();
            long rtAvailableNights = rtRoomsCount * daysInRange;

            List<Booking> rtBookings = bookings.stream()
                    .filter(b -> b.getRoomType() != null && b.getRoomType().getId() != null && b.getRoomType().getId().equals(rt.getId()))
                    .collect(Collectors.toList());

            BigDecimal rtRevenue = rtBookings.stream()
                    .map(this::getEffectiveRevenue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long rtSoldNights = rtBookings.stream()
                    .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                            ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                            : 1)
                    .sum();

            BigDecimal rtAdr = rtSoldNights > 0
                    ? rtRevenue.divide(BigDecimal.valueOf(rtSoldNights), 2, java.math.RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal rtRevpar = rtAvailableNights > 0
                    ? rtRevenue.divide(BigDecimal.valueOf(rtAvailableNights), 2, java.math.RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            double rtOccRate = rtAvailableNights > 0
                    ? Math.round(((double) rtSoldNights / rtAvailableNights * 100.0) * 100.0) / 100.0
                    : 0.0;
            double revenueShare = finalTotalRevenue.compareTo(BigDecimal.ZERO) > 0
                    ? Math.round(rtRevenue.divide(finalTotalRevenue, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 10000.0) / 100.0
                    : 0.0;

            Map<String, Object> rtRow = new LinkedHashMap<>();
            rtRow.put("roomTypeId", rt.getId());
            rtRow.put("roomTypeName", rt.getName() != null ? rt.getName() : "Chưa đặt tên");
            rtRow.put("basePrice", rt.getBasePrice() != null ? rt.getBasePrice() : BigDecimal.ZERO);
            rtRow.put("totalRooms", rtRoomsCount);
            rtRow.put("bookings", rtBookings.size());
            rtRow.put("revenue", rtRevenue);
            rtRow.put("soldNights", rtSoldNights);
            rtRow.put("availableNights", rtAvailableNights);
            rtRow.put("occupancyRate", rtOccRate);
            rtRow.put("adr", rtAdr);
            rtRow.put("revpar", rtRevpar);
            rtRow.put("revenueShare", revenueShare);
            roomTypeRows.add(rtRow);
        }
        roomTypeRows.sort((a, b) -> {
            BigDecimal revA = (BigDecimal) a.get("revenue");
            BigDecimal revB = (BigDecimal) b.get("revenue");
            return (revB != null ? revB : BigDecimal.ZERO).compareTo(revA != null ? revA : BigDecimal.ZERO);
        });

        // 3. Phân rã theo Từng phòng (Individual Room)
        List<Map<String, Object>> roomRows = new ArrayList<>();
        for (plant.stay.model.Room room : allRooms) {
            long roomAvailableNights = daysInRange;
            List<Booking> rBookings = bookings.stream()
                    .filter(b -> b.getRoom() != null && b.getRoom().getId() != null && b.getRoom().getId().equals(room.getId()))
                    .collect(Collectors.toList());

            BigDecimal rRevenue = rBookings.stream()
                    .map(this::getEffectiveRevenue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long rSoldNights = rBookings.stream()
                    .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                            ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                            : 1)
                    .sum();

            BigDecimal rAdr = rSoldNights > 0
                    ? rRevenue.divide(BigDecimal.valueOf(rSoldNights), 2, java.math.RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal rRevpar = roomAvailableNights > 0
                    ? rRevenue.divide(BigDecimal.valueOf(roomAvailableNights), 2, java.math.RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            double rOccRate = roomAvailableNights > 0
                    ? Math.round(((double) rSoldNights / roomAvailableNights * 100.0) * 100.0) / 100.0
                    : 0.0;
            double revenueShare = finalTotalRevenue.compareTo(BigDecimal.ZERO) > 0
                    ? Math.round(rRevenue.divide(finalTotalRevenue, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 10000.0) / 100.0
                    : 0.0;

            Map<String, Object> rRow = new LinkedHashMap<>();
            rRow.put("roomId", room.getId());
            rRow.put("roomNumber", room.getRoomNumber() != null ? room.getRoomNumber() : "");
            rRow.put("floor", room.getFloor());
            rRow.put("roomTypeId", room.getRoomType() != null ? room.getRoomType().getId() : null);
            rRow.put("roomTypeName", room.getRoomType() != null && room.getRoomType().getName() != null ? room.getRoomType().getName() : "Chưa phân loại");
            rRow.put("bookings", rBookings.size());
            rRow.put("revenue", rRevenue);
            rRow.put("soldNights", rSoldNights);
            rRow.put("availableNights", roomAvailableNights);
            rRow.put("occupancyRate", rOccRate);
            rRow.put("adr", rAdr);
            rRow.put("revpar", rRevpar);
            rRow.put("revenueShare", revenueShare);
            roomRows.add(rRow);
        }
        roomRows.sort((a, b) -> {
            String numA = a.get("roomNumber") != null ? a.get("roomNumber").toString() : "";
            String numB = b.get("roomNumber") != null ? b.get("roomNumber").toString() : "";
            return numA.compareTo(numB);
        });

        // Top performing summary
        String topRoomNumber = roomRows.stream()
                .filter(r -> r.get("revenue") != null && ((BigDecimal) r.get("revenue")).compareTo(BigDecimal.ZERO) > 0)
                .max((a, b) -> {
                    BigDecimal revA = (BigDecimal) a.get("revenue");
                    BigDecimal revB = (BigDecimal) b.get("revenue");
                    return (revA != null ? revA : BigDecimal.ZERO).compareTo(revB != null ? revB : BigDecimal.ZERO);
                })
                .map(r -> r.get("roomNumber") != null ? r.get("roomNumber").toString() : "—")
                .orElse("—");

        String topRoomTypeName = roomTypeRows.stream()
                .filter(rt -> rt.get("revpar") != null && ((BigDecimal) rt.get("revpar")).compareTo(BigDecimal.ZERO) > 0)
                .max((a, b) -> {
                    BigDecimal revA = (BigDecimal) a.get("revpar");
                    BigDecimal revB = (BigDecimal) b.get("revpar");
                    return (revA != null ? revA : BigDecimal.ZERO).compareTo(revB != null ? revB : BigDecimal.ZERO);
                })
                .map(rt -> rt.get("roomTypeName") != null ? rt.get("roomTypeName").toString() : "—")
                .orElse("—");

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalRevenue", totalRevenue);
        summary.put("totalSoldNights", totalSoldNights);
        summary.put("totalAvailableNights", totalAvailableRoomNights);
        summary.put("totalRooms", totalRoomsCount);
        summary.put("days", daysInRange);
        summary.put("adr", overallAdr);
        summary.put("revpar", overallRevpar);
        summary.put("occupancyRate", overallOccupancyRate);
        summary.put("bookingCount", bookings.size());
        summary.put("topRoomNumber", topRoomNumber);
        summary.put("topRoomTypeName", topRoomTypeName);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from.toString());
        result.put("to", to.toString());
        result.put("groupBy", groupBy);
        result.put("summary", summary);
        result.put("timelineRows", timelineRows);
        result.put("roomTypeRows", roomTypeRows);
        result.put("roomRows", roomRows);

        return ResponseEntity.ok(result);
    }

    // ========================
    // Export CSV
    // ========================
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam String type,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletRequest request) {
        checkOwner(request);

        StringBuilder csv = new StringBuilder();
        if ("bookings".equals(type)) {
            csv.append("ID,Khách,Phòng,Nhận phòng,Trả phòng,Trạng thái,Tiền phòng\n");
            bookingRepository.findCheckedOutBetween(from, to).forEach(b ->
                    csv.append(String.format("%d,%s,%s,%s,%s,%s,%s\n",
                            b.getId(), b.getGuest().getName(),
                            b.getRoom() != null ? b.getRoom().getRoomNumber() : "",
                            b.getCheckInDate(), b.getCheckOutDate(),
                            b.getStatus().name(),
                            getEffectiveRevenue(b))));
        } else if ("adr_revpar".equals(type)) {
            csv.append("BÁO CÁO GIÁ BÁN TRUNG BÌNH (ADR) VÀ DOANH THU TRÊN MỖI PHÒNG (RevPAR)\n");
            csv.append(String.format("Khoảng thời gian: %s đến %s\n\n", from, to));
            csv.append("Số phòng,Tầng,Loại phòng,Lượt đặt,Đêm phòng bán,Đêm sẵn có,Công suất (%),Doanh thu (đ),ADR (đ),RevPAR (đ),Tỷ trọng (%)\n");

            List<Booking> bookings = bookingRepository.findCheckedOutBetween(from, to);
            List<plant.stay.model.Room> allRooms = roomRepository.findAll();
            long daysInRange = Math.max(1, ChronoUnit.DAYS.between(from, to) + 1);

            BigDecimal totalRevenue = bookings.stream().map(this::getEffectiveRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);

            for (plant.stay.model.Room room : allRooms) {
                List<Booking> rBookings = bookings.stream()
                        .filter(b -> b.getRoom() != null && b.getRoom().getId().equals(room.getId()))
                        .collect(Collectors.toList());
                BigDecimal rRev = rBookings.stream().map(this::getEffectiveRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
                long rSoldNights = rBookings.stream().mapToLong(b -> Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))).sum();
                BigDecimal rAdr = rSoldNights > 0 ? rRev.divide(BigDecimal.valueOf(rSoldNights), 2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
                BigDecimal rRevpar = daysInRange > 0 ? rRev.divide(BigDecimal.valueOf(daysInRange), 2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
                double rOccRate = daysInRange > 0 ? (double) rSoldNights / daysInRange * 100.0 : 0.0;
                double share = totalRevenue.compareTo(BigDecimal.ZERO) > 0 ? rRev.divide(totalRevenue, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100.0 : 0.0;

                csv.append(String.format("%s,%s,%s,%d,%d,%d,%.2f,%s,%s,%s,%.2f\n",
                        room.getRoomNumber(),
                        room.getFloor() != null ? room.getFloor() : "",
                        room.getRoomType() != null ? room.getRoomType().getName() : "",
                        rBookings.size(),
                        rSoldNights,
                        daysInRange,
                        rOccRate,
                        rRev,
                        rAdr,
                        rRevpar,
                        share));
            }
        } else {
            csv.append("Loại export không hỗ trợ\n");
        }

        byte[] bytes = csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=report_" + type + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }

    private void checkOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Chỉ OWNER hoặc ADMIN mới có quyền xem báo cáo");
    }

    private void checkFinance(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ACCOUNTANT && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Không có quyền xem báo cáo doanh thu");
    }
}
