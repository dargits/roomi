package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.response.PeriodComparisonReportResponse;
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

    // ========================================================
    // Báo cáo cơ cấu đặt phòng theo kênh (Channel Structure)
    // ========================================================
    @GetMapping("/channels")
    public ResponseEntity<?> channelReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletRequest request) {
        checkFinance(request);

        List<Booking> bookings = bookingRepository.findBookingsForChannelReport(from, to);
        if (bookings == null) bookings = Collections.emptyList();

        List<String> channelKeys = List.of("WALKIN", "PHONE", "SOCIAL", "ONLINE", "SIMULATION", "UNKNOWN");
        Map<String, List<Booking>> channelGrouped = new LinkedHashMap<>();
        for (String k : channelKeys) {
            channelGrouped.put(k, new ArrayList<>());
        }

        for (Booking b : bookings) {
            String norm = normalizeChannelKey(b.getSource());
            channelGrouped.get(norm).add(b);
        }

        BigDecimal totalOverallRevenue = BigDecimal.ZERO;
        long totalOverallBookings = bookings.size();
        long totalOverallSoldNights = 0;
        long totalOverallCancelled = 0;
        long totalOverallNoShow = 0;

        List<Map<String, Object>> rows = new ArrayList<>();

        for (String k : channelKeys) {
            List<Booking> bList = channelGrouped.get(k);
            long totalB = bList.size();

            long cancelledB = bList.stream().filter(b -> b.getStatus() == plant.stay.model.BookingStatus.CANCELLED).count();
            long noShowB = bList.stream().filter(b -> b.getStatus() == plant.stay.model.BookingStatus.NO_SHOW).count();
            long completedB = bList.stream().filter(b -> b.getStatus() == plant.stay.model.BookingStatus.CHECKED_OUT).count();
            long activeB = bList.stream().filter(b -> b.getStatus() == plant.stay.model.BookingStatus.CHECKED_IN || b.getStatus() == plant.stay.model.BookingStatus.CONFIRMED).count();

            // Doanh thu theo kênh: lấy từ hóa đơn đã lập, không lấy tiền phòng dự kiến
            BigDecimal channelRevenue = bList.stream()
                    .map(this::getInvoiceRevenue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Số đêm phòng bán được: tính từ các booking đã hoàn thành hoặc đang lưu trú trong kỳ
            long soldNights = bList.stream()
                    .filter(b -> b.getStatus() == plant.stay.model.BookingStatus.CHECKED_OUT || b.getStatus() == plant.stay.model.BookingStatus.CHECKED_IN)
                    .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                            ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                            : 1)
                    .sum();

            double cancelRate = totalB > 0
                    ? Math.round(((double) cancelledB / totalB * 100.0) * 100.0) / 100.0
                    : 0.0;
            double noShowRate = totalB > 0
                    ? Math.round(((double) noShowB / totalB * 100.0) * 100.0) / 100.0
                    : 0.0;

            BigDecimal adr = soldNights > 0
                    ? channelRevenue.divide(BigDecimal.valueOf(soldNights), 0, java.math.RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            totalOverallRevenue = totalOverallRevenue.add(channelRevenue);
            totalOverallSoldNights += soldNights;
            totalOverallCancelled += cancelledB;
            totalOverallNoShow += noShowB;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("channelKey", k);
            row.put("channelName", getChannelDisplayName(k));
            row.put("totalBookings", totalB);
            row.put("completedBookings", completedB);
            row.put("activeBookings", activeB);
            row.put("cancelledBookings", cancelledB);
            row.put("cancellationRate", cancelRate);
            row.put("noShowBookings", noShowB);
            row.put("noShowRate", noShowRate);
            row.put("soldNights", soldNights);
            row.put("revenue", channelRevenue);
            row.put("adr", adr);
            rows.add(row);
        }

        // Tính tỷ trọng doanh thu (revenueShare) và tỷ trọng lượt đặt (bookingShare)
        for (Map<String, Object> row : rows) {
            BigDecimal rev = (BigDecimal) row.get("revenue");
            double revShare = totalOverallRevenue.compareTo(BigDecimal.ZERO) > 0
                    ? Math.round(rev.divide(totalOverallRevenue, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 10000.0) / 100.0
                    : 0.0;
            row.put("revenueShare", revShare);

            long tb = (long) row.get("totalBookings");
            double bookShare = totalOverallBookings > 0
                    ? Math.round(((double) tb / totalOverallBookings * 100.0) * 100.0) / 100.0
                    : 0.0;
            row.put("bookingShare", bookShare);
        }

        double overallCancelRate = totalOverallBookings > 0
                ? Math.round(((double) totalOverallCancelled / totalOverallBookings * 100.0) * 100.0) / 100.0
                : 0.0;
        double overallNoShowRate = totalOverallBookings > 0
                ? Math.round(((double) totalOverallNoShow / totalOverallBookings * 100.0) * 100.0) / 100.0
                : 0.0;
        BigDecimal overallAdr = totalOverallSoldNights > 0
                ? totalOverallRevenue.divide(BigDecimal.valueOf(totalOverallSoldNights), 0, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long unknownBookings = channelGrouped.get("UNKNOWN").size();
        double unknownRate = totalOverallBookings > 0
                ? Math.round(((double) unknownBookings / totalOverallBookings * 100.0) * 100.0) / 100.0
                : 0.0;
        double dataQualityScore = Math.round((100.0 - unknownRate) * 100.0) / 100.0;

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("from", from.toString());
        summary.put("to", to.toString());
        summary.put("totalRevenue", totalOverallRevenue);
        summary.put("totalBookings", totalOverallBookings);
        summary.put("totalSoldNights", totalOverallSoldNights);
        summary.put("totalCancelled", totalOverallCancelled);
        summary.put("overallCancellationRate", overallCancelRate);
        summary.put("totalNoShow", totalOverallNoShow);
        summary.put("overallNoShowRate", overallNoShowRate);
        summary.put("overallAdr", overallAdr);
        summary.put("unknownBookings", unknownBookings);
        summary.put("unknownRate", unknownRate);
        summary.put("dataQualityScore", dataQualityScore);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summary", summary);
        result.put("rows", rows);
        return ResponseEntity.ok(result);
    }

    // ========================================================
    // Báo cáo So sánh chỉ số với kỳ trước (CLTSN3-431)
    // ========================================================
    @GetMapping("/period-comparison")
    public ResponseEntity<PeriodComparisonReportResponse> periodComparison(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "custom") String periodType,
            @RequestParam(defaultValue = "both") String compareTarget,
            HttpServletRequest request) {
        checkFinance(request);

        // 1. Xác định các mốc thời gian kỳ trước và cùng kỳ năm trước
        long currentDays = Math.max(1, ChronoUnit.DAYS.between(from, to) + 1);
        LocalDate prevFrom;
        LocalDate prevTo;
        String currentLabel;
        String prevLabel;
        String yoyLabel;

        if ("month".equalsIgnoreCase(periodType)) {
            if (from.getDayOfMonth() == 1 && to.getDayOfMonth() == to.lengthOfMonth()) {
                prevFrom = from.minusMonths(1).withDayOfMonth(1);
                prevTo = prevFrom.withDayOfMonth(prevFrom.lengthOfMonth());
            } else {
                prevFrom = from.minusMonths(1);
                prevTo = to.minusMonths(1);
            }
            currentLabel = "Tháng " + from.format(DateTimeFormatter.ofPattern("MM/yyyy"));
            prevLabel = "Tháng " + prevFrom.format(DateTimeFormatter.ofPattern("MM/yyyy"));
            yoyLabel = "Cùng kỳ năm " + from.minusYears(1).getYear();
        } else if ("quarter".equalsIgnoreCase(periodType)) {
            prevFrom = from.minusMonths(3);
            prevTo = to.minusMonths(3);
            int q = (from.getMonthValue() - 1) / 3 + 1;
            currentLabel = "Quý " + q + "/" + from.getYear();
            int prevQ = (prevFrom.getMonthValue() - 1) / 3 + 1;
            prevLabel = "Quý " + prevQ + "/" + prevFrom.getYear();
            yoyLabel = "Quý " + q + "/" + (from.getYear() - 1);
        } else if ("year".equalsIgnoreCase(periodType)) {
            prevFrom = from.minusYears(1);
            prevTo = to.minusYears(1);
            currentLabel = "Năm " + from.getYear();
            prevLabel = "Năm " + prevFrom.getYear();
            yoyLabel = "Năm " + (from.getYear() - 1);
        } else {
            prevTo = from.minusDays(1);
            prevFrom = prevTo.minusDays(currentDays - 1);
            currentLabel = "Kỳ này (" + from.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " - " + to.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ")";
            prevLabel = "Kỳ trước (" + prevFrom.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " - " + prevTo.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ")";
            yoyLabel = "Cùng kỳ năm ngoái (" + from.minusYears(1).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " - " + to.minusYears(1).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ")";
        }

        LocalDate yoyFrom = from.minusYears(1);
        LocalDate yoyTo = to.minusYears(1);
        long prevDays = Math.max(1, ChronoUnit.DAYS.between(prevFrom, prevTo) + 1);
        long yoyDays = Math.max(1, ChronoUnit.DAYS.between(yoyFrom, yoyTo) + 1);

        PeriodComparisonReportResponse.PeriodInfo currentInfo = PeriodComparisonReportResponse.PeriodInfo.builder()
                .label(currentLabel)
                .from(from.toString())
                .to(to.toString())
                .days(currentDays)
                .build();

        PeriodComparisonReportResponse.PeriodInfo prevInfo = PeriodComparisonReportResponse.PeriodInfo.builder()
                .label(prevLabel)
                .from(prevFrom.toString())
                .to(prevTo.toString())
                .days(prevDays)
                .build();

        PeriodComparisonReportResponse.PeriodInfo yoyInfo = PeriodComparisonReportResponse.PeriodInfo.builder()
                .label(yoyLabel)
                .from(yoyFrom.toString())
                .to(yoyTo.toString())
                .days(yoyDays)
                .build();

        // 2. Tải dữ liệu booking và phòng cho cả 3 kỳ
        List<plant.stay.model.Room> allRooms = roomRepository.findAllWithRoomType();
        if (allRooms == null) allRooms = Collections.emptyList();

        List<plant.stay.model.RoomType> allRoomTypes = roomTypeRepository.findAll();
        if (allRoomTypes == null) allRoomTypes = Collections.emptyList();

        List<Booking> curBookings = bookingRepository.findCheckedOutBetween(from, to);
        if (curBookings == null) curBookings = Collections.emptyList();

        List<Booking> prevBookings = bookingRepository.findCheckedOutBetween(prevFrom, prevTo);
        if (prevBookings == null) prevBookings = Collections.emptyList();

        List<Booking> yoyBookings = bookingRepository.findCheckedOutBetween(yoyFrom, yoyTo);
        if (yoyBookings == null) yoyBookings = Collections.emptyList();

        // 3. Tính toán các chỉ số cho từng kỳ
        PeriodComparisonReportResponse.PeriodMetrics curMetrics = calculatePeriodMetrics(from, to, curBookings, allRooms);
        PeriodComparisonReportResponse.PeriodMetrics prevMetrics = calculatePeriodMetrics(prevFrom, prevTo, prevBookings, allRooms);
        PeriodComparisonReportResponse.PeriodMetrics yoyMetrics = calculatePeriodMetrics(yoyFrom, yoyTo, yoyBookings, allRooms);

        // 4. Tính toán độ chênh lệch Delta và % Tăng trưởng
        PeriodComparisonReportResponse.MetricComparisonSummary popComp = buildComparisonSummary(curMetrics, prevMetrics);
        PeriodComparisonReportResponse.MetricComparisonSummary yoyComp = buildComparisonSummary(curMetrics, yoyMetrics);

        // 5. Tính chuỗi Timeline so sánh theo tiến trình ngày (Day 1..N)
        List<PeriodComparisonReportResponse.ComparisonTimelinePoint> timeline = new ArrayList<>();
        long totalRoomsCount = allRooms.size();
        for (int i = 0; i < currentDays; i++) {
            LocalDate curDay = from.plusDays(i);
            LocalDate prDay = (i < prevDays) ? prevFrom.plusDays(i) : null;
            LocalDate yyDay = (i < yoyDays) ? yoyFrom.plusDays(i) : null;

            BigDecimal cRev = curBookings.stream()
                    .filter(b -> b.getCheckOutDate() != null && b.getCheckOutDate().equals(curDay))
                    .map(this::getEffectiveRevenue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long cNights = curBookings.stream()
                    .filter(b -> b.getCheckOutDate() != null && b.getCheckOutDate().equals(curDay))
                    .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                            ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                            : 1)
                    .sum();
            double cOcc = totalRoomsCount > 0 ? Math.round(((double) cNights / totalRoomsCount * 100.0) * 100.0) / 100.0 : 0.0;

            BigDecimal pRev = BigDecimal.ZERO;
            double pOcc = 0.0;
            if (prDay != null) {
                pRev = prevBookings.stream()
                        .filter(b -> b.getCheckOutDate() != null && b.getCheckOutDate().equals(prDay))
                        .map(this::getEffectiveRevenue)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                long pNights = prevBookings.stream()
                        .filter(b -> b.getCheckOutDate() != null && b.getCheckOutDate().equals(prDay))
                        .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                                ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                                : 1)
                        .sum();
                pOcc = totalRoomsCount > 0 ? Math.round(((double) pNights / totalRoomsCount * 100.0) * 100.0) / 100.0 : 0.0;
            }

            BigDecimal yRev = BigDecimal.ZERO;
            double yOcc = 0.0;
            if (yyDay != null) {
                yRev = yoyBookings.stream()
                        .filter(b -> b.getCheckOutDate() != null && b.getCheckOutDate().equals(yyDay))
                        .map(this::getEffectiveRevenue)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                long yNights = yoyBookings.stream()
                        .filter(b -> b.getCheckOutDate() != null && b.getCheckOutDate().equals(yyDay))
                        .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                                ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                                : 1)
                        .sum();
                yOcc = totalRoomsCount > 0 ? Math.round(((double) yNights / totalRoomsCount * 100.0) * 100.0) / 100.0 : 0.0;
            }

            timeline.add(PeriodComparisonReportResponse.ComparisonTimelinePoint.builder()
                    .dayIndex(i + 1)
                    .currentDate(curDay.toString())
                    .currentRevenue(cRev)
                    .currentOccupancyRate(cOcc)
                    .previousDate(prDay != null ? prDay.toString() : "")
                    .previousRevenue(pRev)
                    .previousOccupancyRate(pOcc)
                    .samePeriodLastYearDate(yyDay != null ? yyDay.toString() : "")
                    .samePeriodLastYearRevenue(yRev)
                    .samePeriodLastYearOccupancyRate(yOcc)
                    .build());
        }

        // 6. Tính phân rã theo Loại phòng (Room Type Comparison)
        List<PeriodComparisonReportResponse.RoomTypeComparisonDto> roomTypeDtos = new ArrayList<>();
        for (plant.stay.model.RoomType rt : allRoomTypes) {
            long rtRoomsCount = allRooms.stream()
                    .filter(r -> r.getRoomType() != null && r.getRoomType().getId() != null && r.getRoomType().getId().equals(rt.getId()))
                    .count();

            // Kỳ hiện tại
            long curAvail = rtRoomsCount * currentDays;
            List<Booking> rtCurBookings = curBookings.stream()
                    .filter(b -> b.getRoomType() != null && b.getRoomType().getId() != null && b.getRoomType().getId().equals(rt.getId()))
                    .collect(Collectors.toList());
            BigDecimal curRev = rtCurBookings.stream().map(this::getEffectiveRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
            long curSold = rtCurBookings.stream()
                    .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                            ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                            : 1)
                    .sum();
            double curOcc = curAvail > 0 ? Math.round(((double) curSold / curAvail * 100.0) * 100.0) / 100.0 : 0.0;
            BigDecimal curAdr = curSold > 0 ? curRev.divide(BigDecimal.valueOf(curSold), 0, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
            BigDecimal curRevpar = curAvail > 0 ? curRev.divide(BigDecimal.valueOf(curAvail), 0, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;

            // Kỳ liền trước
            long prevAvail = rtRoomsCount * prevDays;
            List<Booking> rtPrevBookings = prevBookings.stream()
                    .filter(b -> b.getRoomType() != null && b.getRoomType().getId() != null && b.getRoomType().getId().equals(rt.getId()))
                    .collect(Collectors.toList());
            BigDecimal prevRev = rtPrevBookings.stream().map(this::getEffectiveRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
            long prevSold = rtPrevBookings.stream()
                    .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                            ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                            : 1)
                    .sum();
            double prevOcc = prevAvail > 0 ? Math.round(((double) prevSold / prevAvail * 100.0) * 100.0) / 100.0 : 0.0;
            BigDecimal prevAdr = prevSold > 0 ? prevRev.divide(BigDecimal.valueOf(prevSold), 0, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
            BigDecimal prevRevpar = prevAvail > 0 ? prevRev.divide(BigDecimal.valueOf(prevAvail), 0, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;

            double popGrowth = calculateGrowthRate(curRev, prevRev);
            double popOccDiff = Math.round((curOcc - prevOcc) * 100.0) / 100.0;

            // Cùng kỳ năm trước
            long yoyAvail = rtRoomsCount * yoyDays;
            List<Booking> rtYoyBookings = yoyBookings.stream()
                    .filter(b -> b.getRoomType() != null && b.getRoomType().getId() != null && b.getRoomType().getId().equals(rt.getId()))
                    .collect(Collectors.toList());
            BigDecimal yyRev = rtYoyBookings.stream().map(this::getEffectiveRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
            long yySold = rtYoyBookings.stream()
                    .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                            ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                            : 1)
                    .sum();
            double yyOcc = yoyAvail > 0 ? Math.round(((double) yySold / yoyAvail * 100.0) * 100.0) / 100.0 : 0.0;
            BigDecimal yyAdr = yySold > 0 ? yyRev.divide(BigDecimal.valueOf(yySold), 0, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
            BigDecimal yyRevpar = yoyAvail > 0 ? yyRev.divide(BigDecimal.valueOf(yoyAvail), 0, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;

            double yoyGrowth = calculateGrowthRate(curRev, yyRev);
            double yoyOccDiff = Math.round((curOcc - yyOcc) * 100.0) / 100.0;

            roomTypeDtos.add(PeriodComparisonReportResponse.RoomTypeComparisonDto.builder()
                    .roomTypeId(rt.getId())
                    .roomTypeName(rt.getName() != null ? rt.getName() : "Chưa đặt tên")
                    .basePrice(rt.getBasePrice() != null ? rt.getBasePrice() : BigDecimal.ZERO)
                    .totalRooms(rtRoomsCount)
                    .currentRevenue(curRev)
                    .currentSoldNights(curSold)
                    .currentOccupancyRate(curOcc)
                    .currentAdr(curAdr)
                    .currentRevpar(curRevpar)
                    .currentBookings(rtCurBookings.size())
                    .previousRevenue(prevRev)
                    .previousSoldNights(prevSold)
                    .previousOccupancyRate(prevOcc)
                    .previousAdr(prevAdr)
                    .previousRevpar(prevRevpar)
                    .previousBookings(rtPrevBookings.size())
                    .popRevenueGrowth(popGrowth)
                    .popOccupancyDiff(popOccDiff)
                    .yoyRevenue(yyRev)
                    .yoySoldNights(yySold)
                    .yoyOccupancyRate(yyOcc)
                    .yoyAdr(yyAdr)
                    .yoyRevpar(yyRevpar)
                    .yoyBookings(rtYoyBookings.size())
                    .yoyRevenueGrowth(yoyGrowth)
                    .yoyOccupancyDiff(yoyOccDiff)
                    .build());
        }

        roomTypeDtos.sort((a, b) -> (b.getCurrentRevenue() != null ? b.getCurrentRevenue() : BigDecimal.ZERO)
                .compareTo(a.getCurrentRevenue() != null ? a.getCurrentRevenue() : BigDecimal.ZERO));

        // 7. Sinh nhận định và đánh giá kinh doanh tự động (Executive Insights)
        List<String> executiveInsights = generateExecutiveInsights(
                currentInfo, curMetrics, prevMetrics, yoyMetrics, popComp, yoyComp, roomTypeDtos);

        PeriodComparisonReportResponse response = PeriodComparisonReportResponse.builder()
                .currentPeriod(currentInfo)
                .previousPeriod(prevInfo)
                .samePeriodLastYear(yoyInfo)
                .currentMetrics(curMetrics)
                .previousMetrics(prevMetrics)
                .samePeriodLastYearMetrics(yoyMetrics)
                .popComparison(popComp)
                .yoyComparison(yoyComp)
                .timeline(timeline)
                .roomTypes(roomTypeDtos)
                .executiveInsights(executiveInsights)
                .build();

        return ResponseEntity.ok(response);
    }

    private PeriodComparisonReportResponse.PeriodMetrics calculatePeriodMetrics(
            LocalDate f, LocalDate t, List<Booking> bookings, List<plant.stay.model.Room> allRooms) {
        long days = Math.max(1, ChronoUnit.DAYS.between(f, t) + 1);
        long totalRooms = allRooms.size();
        long availableRoomNights = totalRooms * days;

        BigDecimal roomRevenue = BigDecimal.ZERO;
        BigDecimal collectedRevenue = BigDecimal.ZERO;
        long soldRoomNights = 0;

        for (Booking b : bookings) {
            BigDecimal rev = getEffectiveRevenue(b);
            roomRevenue = roomRevenue.add(rev != null ? rev : BigDecimal.ZERO);
            BigDecimal paid = getBookingPaidAmount(b);
            collectedRevenue = collectedRevenue.add(paid != null ? paid : BigDecimal.ZERO);

            long nights = (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                    ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                    : 1;
            soldRoomNights += nights;
        }

        BigDecimal debtRevenue = roomRevenue.subtract(collectedRevenue).max(BigDecimal.ZERO);

        List<DepositStatus> penaltyStatuses = List.of(DepositStatus.FORFEITED, DepositStatus.PARTIALLY_REFUNDED);
        List<plant.stay.model.Deposit> penaltyDeposits = depositRepository.findPenaltyDepositsBetween(penaltyStatuses, f, t);
        BigDecimal penaltyRevenue = penaltyDeposits.stream()
                .map(d -> d.getPenaltyAmount() != null ? d.getPenaltyAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalRevenue = roomRevenue.add(penaltyRevenue);

        double occupancyRate = availableRoomNights > 0
                ? Math.round(((double) soldRoomNights / availableRoomNights * 100.0) * 100.0) / 100.0
                : 0.0;

        BigDecimal adr = soldRoomNights > 0
                ? roomRevenue.divide(BigDecimal.valueOf(soldRoomNights), 0, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal revpar = availableRoomNights > 0
                ? roomRevenue.divide(BigDecimal.valueOf(availableRoomNights), 0, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return PeriodComparisonReportResponse.PeriodMetrics.builder()
                .roomRevenue(roomRevenue)
                .penaltyRevenue(penaltyRevenue)
                .totalRevenue(totalRevenue)
                .collectedRevenue(collectedRevenue)
                .debtRevenue(debtRevenue)
                .totalBookings(bookings.size())
                .soldRoomNights(soldRoomNights)
                .availableRoomNights(availableRoomNights)
                .occupancyRate(occupancyRate)
                .adr(adr)
                .revpar(revpar)
                .build();
    }

    private double calculateGrowthRate(BigDecimal current, BigDecimal prior) {
        if (prior == null || prior.compareTo(BigDecimal.ZERO) == 0) {
            return (current != null && current.compareTo(BigDecimal.ZERO) > 0) ? 100.0 : 0.0;
        }
        BigDecimal cur = current != null ? current : BigDecimal.ZERO;
        return Math.round(cur.subtract(prior).divide(prior, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 10000.0) / 100.0;
    }

    private double calculateGrowthRate(double current, double prior) {
        if (prior == 0.0) {
            return current > 0 ? 100.0 : 0.0;
        }
        return Math.round(((current - prior) / prior * 100.0) * 100.0) / 100.0;
    }

    private double calculateGrowthRate(long current, long prior) {
        if (prior == 0) {
            return current > 0 ? 100.0 : 0.0;
        }
        return Math.round(((double) (current - prior) / prior * 100.0) * 100.0) / 100.0;
    }

    private PeriodComparisonReportResponse.MetricComparisonSummary buildComparisonSummary(
            PeriodComparisonReportResponse.PeriodMetrics current,
            PeriodComparisonReportResponse.PeriodMetrics prior) {
        if (current == null || prior == null) {
            return new PeriodComparisonReportResponse.MetricComparisonSummary();
        }

        BigDecimal totalRevDiff = current.getTotalRevenue().subtract(prior.getTotalRevenue());
        double totalRevGrowth = calculateGrowthRate(current.getTotalRevenue(), prior.getTotalRevenue());

        BigDecimal roomRevDiff = current.getRoomRevenue().subtract(prior.getRoomRevenue());
        double roomRevGrowth = calculateGrowthRate(current.getRoomRevenue(), prior.getRoomRevenue());

        double occDiff = Math.round((current.getOccupancyRate() - prior.getOccupancyRate()) * 100.0) / 100.0;
        double occGrowth = calculateGrowthRate(current.getOccupancyRate(), prior.getOccupancyRate());

        BigDecimal adrDiff = current.getAdr().subtract(prior.getAdr());
        double adrGrowth = calculateGrowthRate(current.getAdr(), prior.getAdr());

        BigDecimal revparDiff = current.getRevpar().subtract(prior.getRevpar());
        double revparGrowth = calculateGrowthRate(current.getRevpar(), prior.getRevpar());

        long soldNightsDiff = current.getSoldRoomNights() - prior.getSoldRoomNights();
        double soldNightsGrowth = calculateGrowthRate(current.getSoldRoomNights(), prior.getSoldRoomNights());

        long bookingsDiff = current.getTotalBookings() - prior.getTotalBookings();
        double bookingsGrowth = calculateGrowthRate(current.getTotalBookings(), prior.getTotalBookings());

        return PeriodComparisonReportResponse.MetricComparisonSummary.builder()
                .totalRevenueDiff(totalRevDiff)
                .totalRevenueGrowthRate(totalRevGrowth)
                .roomRevenueDiff(roomRevDiff)
                .roomRevenueGrowthRate(roomRevGrowth)
                .occupancyRateDiff(occDiff)
                .occupancyGrowthRate(occGrowth)
                .adrDiff(adrDiff)
                .adrGrowthRate(adrGrowth)
                .revparDiff(revparDiff)
                .revparGrowthRate(revparGrowth)
                .soldNightsDiff(soldNightsDiff)
                .soldNightsGrowthRate(soldNightsGrowth)
                .bookingsDiff(bookingsDiff)
                .bookingsGrowthRate(bookingsGrowth)
                .build();
    }

    private List<String> generateExecutiveInsights(
            PeriodComparisonReportResponse.PeriodInfo currentInfo,
            PeriodComparisonReportResponse.PeriodMetrics current,
            PeriodComparisonReportResponse.PeriodMetrics previous,
            PeriodComparisonReportResponse.PeriodMetrics yoy,
            PeriodComparisonReportResponse.MetricComparisonSummary pop,
            PeriodComparisonReportResponse.MetricComparisonSummary yoyComp,
            List<PeriodComparisonReportResponse.RoomTypeComparisonDto> roomTypes) {
        List<String> insights = new ArrayList<>();

        // 1. Nhận định Doanh thu & Tăng trưởng PoP
        String revTrend = pop.getTotalRevenueGrowthRate() >= 0 ? "tăng trưởng" : "suy giảm";
        String revSign = pop.getTotalRevenueGrowthRate() >= 0 ? "+" : "";
        insights.add(String.format("Tổng doanh thu %s đạt %,d đ, %s %s%.1f%% (%s%,d đ) so với kỳ liền trước.",
                currentInfo.getLabel().toLowerCase(),
                current.getTotalRevenue().longValue(),
                revTrend,
                revSign,
                pop.getTotalRevenueGrowthRate(),
                pop.getTotalRevenueDiff().compareTo(BigDecimal.ZERO) >= 0 ? "+" : "",
                pop.getTotalRevenueDiff().longValue()));

        // 2. Nhận định Công suất phòng & ADR
        String occSign = pop.getOccupancyRateDiff() >= 0 ? "+" : "";
        String adrSign = pop.getAdrGrowthRate() >= 0 ? "+" : "";
        insights.add(String.format("Công suất phòng đạt %.1f%% (%s%.1f điểm %% so với kỳ trước). Giá bán bình quân (ADR) đạt %,d đ/đêm (%s%.1f%%), chỉ số RevPAR đạt %,d đ/phòng.",
                current.getOccupancyRate(),
                occSign,
                pop.getOccupancyRateDiff(),
                current.getAdr().longValue(),
                adrSign,
                pop.getAdrGrowthRate(),
                current.getRevpar().longValue()));

        // 3. Phân tích nguyên nhân tăng trưởng
        if (pop.getTotalRevenueGrowthRate() > 0) {
            if (pop.getOccupancyRateDiff() > 0 && pop.getAdrGrowthRate() > 0) {
                insights.add("Tăng trưởng tích cực và toàn diện khi cả công suất lấp đầy phòng và giá bán trung bình (ADR) đều tăng so với kỳ trước.");
            } else if (pop.getOccupancyRateDiff() > 0) {
                insights.add("Động lực tăng trưởng doanh thu kỳ này chủ yếu đến từ việc gia tăng số lượng đêm phòng bán được và công suất phòng.");
            } else {
                insights.add("Doanh thu tăng chủ yếu nhờ tối ưu hóa giá bán bình quân (ADR) cao hơn dù công suất phòng không tăng.");
            }
        } else if (pop.getTotalRevenueGrowthRate() < 0) {
            if (pop.getOccupancyRateDiff() < 0 && pop.getAdrGrowthRate() < 0) {
                insights.add("Doanh thu suy giảm do cả tỷ lệ lấp đầy và giá bán bình quân đều thấp hơn kỳ trước. Cần rà soát chính sách giá và chương trình khuyến mãi.");
            } else if (pop.getOccupancyRateDiff() < 0) {
                insights.add("Doanh thu giảm do tỷ lệ lấp đầy phòng sụt giảm. Cần đẩy mạnh các kênh bán hàng để lấp đầy phòng trống.");
            } else {
                insights.add("Tỷ lệ lấp đầy phòng được duy trì nhưng giá bán bình quân giảm, ảnh hưởng đến tổng doanh thu.");
            }
        } else {
            insights.add("Doanh thu và hiệu quả khai thác phòng kỳ này duy trì ổn định tương đương kỳ liền trước.");
        }

        // 4. Đánh giá cùng kỳ năm trước (YoY)
        if (yoy != null && yoy.getTotalRevenue().compareTo(BigDecimal.ZERO) > 0) {
            String yoySign = yoyComp.getTotalRevenueGrowthRate() >= 0 ? "+" : "";
            insights.add(String.format("So với cùng kỳ năm trước, doanh thu %s %s%.1f%% và công suất phòng %s (%s%.1f điểm %%).",
                    yoyComp.getTotalRevenueGrowthRate() >= 0 ? "tăng" : "giảm",
                    yoySign,
                    yoyComp.getTotalRevenueGrowthRate(),
                    yoyComp.getOccupancyRateDiff() >= 0 ? "cải thiện" : "sụt giảm",
                    yoyComp.getOccupancyRateDiff() >= 0 ? "+" : "",
                    yoyComp.getOccupancyRateDiff()));
        }

        // 5. Loại phòng nổi bật
        if (roomTypes != null && !roomTypes.isEmpty()) {
            roomTypes.stream()
                    .filter(rt -> rt.getCurrentRevenue() != null && rt.getCurrentRevenue().compareTo(BigDecimal.ZERO) > 0)
                    .max(Comparator.comparing(PeriodComparisonReportResponse.RoomTypeComparisonDto::getCurrentRevenue))
                    .ifPresent(topRt -> insights.add(String.format("Hạng phòng đóng góp doanh thu lớn nhất là '%s' với %,d đ (chiếm %.1f%% tổng doanh thu phòng, công suất %.1f%%).",
                            topRt.getRoomTypeName(),
                            topRt.getCurrentRevenue().longValue(),
                            current.getRoomRevenue().compareTo(BigDecimal.ZERO) > 0
                                    ? topRt.getCurrentRevenue().divide(current.getRoomRevenue(), 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100.0
                                    : 0.0,
                            topRt.getCurrentOccupancyRate())));
        }

        return insights;
    }

    // ========================
    // Export CSV
    // ========================
    public ResponseEntity<byte[]> export(String type, LocalDate from, LocalDate to, HttpServletRequest request) {
        return export(type, from, to, "custom", request);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam String type,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "custom") String periodType,
            HttpServletRequest request) {
        checkFinance(request);

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
        } else if ("channels".equals(type) || "channel".equals(type)) {
            csv.append("BÁO CÁO CƠ CẤU ĐẶT PHÒNG THEO KÊNH\n");
            csv.append(String.format("Khoảng thời gian: %s đến %s\n\n", from, to));
            csv.append("Kênh đặt phòng,Mã kênh,Lượt đặt phòng,Đêm phòng bán,Doanh thu từ hóa đơn (đ),Tỷ trọng DT (%),Lượt hủy,Tỷ lệ hủy (%),Lượt khách vắng,Tỷ lệ vắng (%),ADR (đ)\n");

            List<Booking> bookings = bookingRepository.findBookingsForChannelReport(from, to);
            if (bookings == null) bookings = Collections.emptyList();

            List<String> channelKeys = List.of("WALKIN", "PHONE", "SOCIAL", "ONLINE", "SIMULATION", "UNKNOWN");
            Map<String, List<Booking>> channelGrouped = new LinkedHashMap<>();
            for (String k : channelKeys) {
                channelGrouped.put(k, new ArrayList<>());
            }
            for (Booking b : bookings) {
                String norm = normalizeChannelKey(b.getSource());
                channelGrouped.get(norm).add(b);
            }

            BigDecimal totalRev = BigDecimal.ZERO;
            long totalB = bookings.size();
            long totalNights = 0;
            long totalCancel = 0;
            long totalNoShow = 0;

            for (String k : channelKeys) {
                List<Booking> bList = channelGrouped.get(k);
                long cnt = bList.size();
                long can = bList.stream().filter(b -> b.getStatus() == plant.stay.model.BookingStatus.CANCELLED).count();
                long ns = bList.stream().filter(b -> b.getStatus() == plant.stay.model.BookingStatus.NO_SHOW).count();
                BigDecimal rev = bList.stream().map(this::getInvoiceRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
                long nights = bList.stream()
                        .filter(b -> b.getStatus() == plant.stay.model.BookingStatus.CHECKED_OUT || b.getStatus() == plant.stay.model.BookingStatus.CHECKED_IN)
                        .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                                ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                                : 1)
                        .sum();

                totalRev = totalRev.add(rev);
                totalNights += nights;
                totalCancel += can;
                totalNoShow += ns;
            }

            for (String k : channelKeys) {
                List<Booking> bList = channelGrouped.get(k);
                long cnt = bList.size();
                long can = bList.stream().filter(b -> b.getStatus() == plant.stay.model.BookingStatus.CANCELLED).count();
                long ns = bList.stream().filter(b -> b.getStatus() == plant.stay.model.BookingStatus.NO_SHOW).count();
                BigDecimal rev = bList.stream().map(this::getInvoiceRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
                long nights = bList.stream()
                        .filter(b -> b.getStatus() == plant.stay.model.BookingStatus.CHECKED_OUT || b.getStatus() == plant.stay.model.BookingStatus.CHECKED_IN)
                        .mapToLong(b -> (b.getCheckInDate() != null && b.getCheckOutDate() != null)
                                ? Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                                : 1)
                        .sum();
                double cRate = cnt > 0 ? (double) can / cnt * 100.0 : 0.0;
                double nsRate = cnt > 0 ? (double) ns / cnt * 100.0 : 0.0;
                double share = totalRev.compareTo(BigDecimal.ZERO) > 0 ? rev.divide(totalRev, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100.0 : 0.0;
                BigDecimal adr = nights > 0 ? rev.divide(BigDecimal.valueOf(nights), 0, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;

                csv.append(String.format("%s,%s,%d,%d,%s,%.2f,%d,%.2f,%d,%.2f,%s\n",
                        getChannelDisplayName(k),
                        k,
                        cnt,
                        nights,
                        rev,
                        share,
                        can,
                        cRate,
                        ns,
                        nsRate,
                        adr));
            }

            double overallCRate = totalB > 0 ? (double) totalCancel / totalB * 100.0 : 0.0;
            double overallNSRate = totalB > 0 ? (double) totalNoShow / totalB * 100.0 : 0.0;
            BigDecimal overallAdr = totalNights > 0 ? totalRev.divide(BigDecimal.valueOf(totalNights), 0, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;

            csv.append(String.format("TỔNG CỘNG,ALL,%d,%d,%s,100.00,%d,%.2f,%d,%.2f,%s\n",
                    totalB,
                    totalNights,
                    totalRev,
                    totalCancel,
                    overallCRate,
                    totalNoShow,
                    overallNSRate,
                    overallAdr));
        } else if ("period_comparison".equals(type) || "comparison".equals(type)) {
            csv.append("BÁO CÁO SO SÁNH CHỈ SỐ VỚI KỲ TRƯỚC VÀ CÙNG KỲ NĂM TRƯỚC\n");
            csv.append(String.format("Khoảng thời gian phân tích: %s đến %s\n\n", from, to));

            // Gọi logic tính toán so sánh
            PeriodComparisonReportResponse report = (PeriodComparisonReportResponse) periodComparison(from, to, periodType, "both", request).getBody();
            if (report != null) {
                csv.append(String.format("Kỳ hiện tại: %s (%s đến %s)\n", report.getCurrentPeriod().getLabel(), report.getCurrentPeriod().getFrom(), report.getCurrentPeriod().getTo()));
                csv.append(String.format("Kỳ liền trước: %s (%s đến %s)\n", report.getPreviousPeriod().getLabel(), report.getPreviousPeriod().getFrom(), report.getPreviousPeriod().getTo()));
                csv.append(String.format("Cùng kỳ năm trước: %s (%s đến %s)\n\n", report.getSamePeriodLastYear().getLabel(), report.getSamePeriodLastYear().getFrom(), report.getSamePeriodLastYear().getTo()));

                csv.append("1. BẢNG ĐỐI CHIẾU CHỈ SỐ HIỆU SUẤT TỔNG HỢP\n");
                csv.append("Chỉ số đo lường,Kỳ hiện tại,Kỳ liền trước,Chênh lệch PoP,Tăng trưởng PoP (%),Cùng kỳ năm trước,Chênh lệch YoY,Tăng trưởng YoY (%)\n");

                PeriodComparisonReportResponse.PeriodMetrics c = report.getCurrentMetrics();
                PeriodComparisonReportResponse.PeriodMetrics p = report.getPreviousMetrics();
                PeriodComparisonReportResponse.PeriodMetrics y = report.getSamePeriodLastYearMetrics();
                PeriodComparisonReportResponse.MetricComparisonSummary pop = report.getPopComparison();
                PeriodComparisonReportResponse.MetricComparisonSummary yoy = report.getYoyComparison();

                csv.append(String.format("Tổng doanh thu (đ),%s,%s,%s,%.2f%%,%s,%s,%.2f%%\n",
                        c.getTotalRevenue(), p.getTotalRevenue(), pop.getTotalRevenueDiff(), pop.getTotalRevenueGrowthRate(),
                        y.getTotalRevenue(), yoy.getTotalRevenueDiff(), yoy.getTotalRevenueGrowthRate()));
                csv.append(String.format("Doanh thu phòng (đ),%s,%s,%s,%.2f%%,%s,%s,%.2f%%\n",
                        c.getRoomRevenue(), p.getRoomRevenue(), pop.getRoomRevenueDiff(), pop.getRoomRevenueGrowthRate(),
                        y.getRoomRevenue(), yoy.getRoomRevenueDiff(), yoy.getRoomRevenueGrowthRate()));
                csv.append(String.format("Phí phạt hủy/giữ cọc (đ),%s,%s,%s,0.00%%,%s,%s,0.00%%\n",
                        c.getPenaltyRevenue(), p.getPenaltyRevenue(), c.getPenaltyRevenue().subtract(p.getPenaltyRevenue()),
                        y.getPenaltyRevenue(), c.getPenaltyRevenue().subtract(y.getPenaltyRevenue())));
                csv.append(String.format("Công suất phòng (%%),%.2f%%,%.2f%%,%+.2f%%pts,%.2f%%,%.2f%%,%+.2f%%pts,%.2f%%\n",
                        c.getOccupancyRate(), p.getOccupancyRate(), pop.getOccupancyRateDiff(), pop.getOccupancyGrowthRate(),
                        y.getOccupancyRate(), yoy.getOccupancyRateDiff(), yoy.getOccupancyGrowthRate()));
                csv.append(String.format("Giá bán bình quân ADR (đ),%s,%s,%s,%.2f%%,%s,%s,%.2f%%\n",
                        c.getAdr(), p.getAdr(), pop.getAdrDiff(), pop.getAdrGrowthRate(),
                        y.getAdr(), yoy.getAdrDiff(), yoy.getAdrGrowthRate()));
                csv.append(String.format("Doanh thu/phòng RevPAR (đ),%s,%s,%s,%.2f%%,%s,%s,%.2f%%\n",
                        c.getRevpar(), p.getRevpar(), pop.getRevparDiff(), pop.getRevparGrowthRate(),
                        y.getRevpar(), yoy.getRevparDiff(), yoy.getRevparGrowthRate()));
                csv.append(String.format("Đêm phòng bán được,%d,%d,%+d,%.2f%%,%d,%+d,%.2f%%\n",
                        c.getSoldRoomNights(), p.getSoldRoomNights(), pop.getSoldNightsDiff(), pop.getSoldNightsGrowthRate(),
                        y.getSoldRoomNights(), yoy.getSoldNightsDiff(), yoy.getSoldNightsGrowthRate()));
                csv.append(String.format("Tổng lượt đặt phòng,%d,%d,%+d,%.2f%%,%d,%+d,%.2f%%\n",
                        c.getTotalBookings(), p.getTotalBookings(), pop.getBookingsDiff(), pop.getBookingsGrowthRate(),
                        y.getTotalBookings(), yoy.getBookingsDiff(), yoy.getBookingsGrowthRate()));

                // Bảng 2: Phân rã theo từng loại phòng
                csv.append("\n2. ĐỐI CHIẾU THEO TỪNG HẠNG PHÒNG\n");
                csv.append("Hạng phòng,Số phòng,Doanh thu Kỳ này (đ),Doanh thu Kỳ trước (đ),Tăng trưởng DT PoP (%),Công suất Kỳ này (%),Công suất Kỳ trước (%),Lệch CS PoP (%pts),ADR Kỳ này (đ),ADR Kỳ trước (đ),DT Cùng kỳ năm trước (đ),Tăng trưởng DT YoY (%)\n");
                for (PeriodComparisonReportResponse.RoomTypeComparisonDto rt : report.getRoomTypes()) {
                    csv.append(String.format("%s,%d,%s,%s,%.2f%%,%.2f%%,%.2f%%,%+.2f%%pts,%s,%s,%s,%.2f%%\n",
                            rt.getRoomTypeName(),
                            rt.getTotalRooms(),
                            rt.getCurrentRevenue(),
                            rt.getPreviousRevenue(),
                            rt.getPopRevenueGrowth(),
                            rt.getCurrentOccupancyRate(),
                            rt.getPreviousOccupancyRate(),
                            rt.getPopOccupancyDiff(),
                            rt.getCurrentAdr(),
                            rt.getPreviousAdr(),
                            rt.getYoyRevenue(),
                            rt.getYoyRevenueGrowth()));
                }

                // Bảng 3: Nhận định đánh giá
                csv.append("\n3. NHẬN ĐỊNH VÀ ĐÁNH GIÁ KINH DOANH TỰ ĐỘNG\n");
                for (int idx = 0; idx < report.getExecutiveInsights().size(); idx++) {
                    csv.append(String.format("Insight %d:,\"%s\"\n", idx + 1, report.getExecutiveInsights().get(idx).replace("\"", "\"\"")));
                }
            }
        } else {
            csv.append("Loại export không hỗ trợ\n");
        }

        byte[] bytes = ("\uFEFF" + csv.toString()).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=report_" + type + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }

    private BigDecimal getInvoiceRevenue(Booking b) {
        if (b == null) return BigDecimal.ZERO;
        try {
            Optional<Invoice> invOpt = invoiceRepository.findByBookingId(b.getId());
            if (invOpt.isPresent()) {
                Invoice inv = invOpt.get();
                if (inv.getTotalAmount() != null && inv.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
                    return inv.getTotalAmount();
                }
            }
        } catch (Exception ignored) {}
        if (b.getStatus() == plant.stay.model.BookingStatus.CHECKED_OUT && b.getActualPrice() != null && b.getActualPrice().compareTo(BigDecimal.ZERO) > 0) {
            return b.getActualPrice();
        }
        return BigDecimal.ZERO;
    }

    public static String normalizeChannelKey(String rawSource) {
        if (rawSource == null || rawSource.trim().isEmpty()) {
            return "UNKNOWN";
        }
        String s = rawSource.trim().toUpperCase();
        if (s.equals("WALKIN") || s.equals("TAI_QUAY") || s.equals("QUAY") || s.contains("WALK")) {
            return "WALKIN";
        }
        if (s.equals("PHONE") || s.equals("DIEN_THOAI") || s.equals("HOTLINE") || s.contains("PHONE")) {
            return "PHONE";
        }
        if (s.equals("SOCIAL") || s.equals("MANG_XA_HOI") || s.equals("FACEBOOK") || s.equals("ZALO") || s.equals("TIKTOK") || s.equals("INSTAGRAM")) {
            return "SOCIAL";
        }
        if (s.equals("ONLINE") || s.equals("WEB") || s.equals("WEBSITE") || s.equals("PORTAL")) {
            return "ONLINE";
        }
        if (s.equals("SIMULATION") || s.equals("OTA") || s.equals("AIRBNB") || s.equals("BOOKING_COM") || s.equals("AGODA") || s.equals("TRIP_COM") || s.contains("SIMULAT")) {
            return "SIMULATION";
        }
        return "UNKNOWN";
    }

    public static String getChannelDisplayName(String channelKey) {
        switch (channelKey) {
            case "WALKIN": return "Kênh tại quầy";
            case "PHONE": return "Kênh điện thoại";
            case "SOCIAL": return "Kênh mạng xã hội";
            case "ONLINE": return "Cổng đặt phòng trực tiếp";
            case "SIMULATION": return "Kênh mô phỏng nhận đặt (OTA)";
            case "UNKNOWN":
            default: return "Chưa xác định";
        }
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
