package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Booking;
import plant.stay.model.Role;
import plant.stay.model.RoomStatus;
import plant.stay.model.User;
import plant.stay.model.Invoice;
import plant.stay.repository.BookingRepository;
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
public class ReportController {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final InvoiceRepository invoiceRepository;
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
        // Kiểm tra hóa đơn của booking
        Optional<Invoice> invOpt = invoiceRepository.findByBookingId(b.getId());
        if (invOpt.isPresent() && invOpt.get().getTotalAmount() != null && invOpt.get().getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
            return invOpt.get().getTotalAmount();
        }
        if (b.getExpectedPrice() != null && b.getExpectedPrice().compareTo(BigDecimal.ZERO) > 0) {
            return b.getExpectedPrice();
        }
        return BigDecimal.ZERO;
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
        long todayCheckIns  = todayBookings.stream().filter(b -> b.getCheckInDate().equals(today)).count();
        long todayCheckOuts = todayBookings.stream().filter(b -> b.getCheckOutDate().equals(today)).count();

        // Doanh thu tháng (chỉ từ booking đã CHECKED_OUT trong tháng)
        LocalDate firstOfMonth = today.withDayOfMonth(1);
        List<Booking> monthBookings = bookingRepository.findCheckedOutBetween(firstOfMonth, today);
        BigDecimal monthRevenue = monthBookings.stream()
                .map(this::getEffectiveRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

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
        int bookingCount = bookings.size();

        // Tạo rows chi tiết theo ngày hoặc tháng
        List<Map<String, Object>> rows;
        if ("month".equalsIgnoreCase(groupBy)) {
            // Group by month: YYYY-MM
            Map<String, List<Booking>> grouped = bookings.stream()
                    .collect(Collectors.groupingBy(b ->
                            b.getCheckOutDate().format(DateTimeFormatter.ofPattern("yyyy-MM"))));
            rows = grouped.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .map(e -> {
                        BigDecimal rev = e.getValue().stream()
                                .map(this::getEffectiveRevenue)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("period", e.getKey());
                        row.put("bookings", e.getValue().size());
                        row.put("revenue", rev);
                        return row;
                    })
                    .collect(Collectors.toList());
        } else {
            // Group by day: YYYY-MM-DD
            Map<LocalDate, List<Booking>> grouped = bookings.stream()
                    .collect(Collectors.groupingBy(Booking::getCheckOutDate));
            rows = grouped.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .map(e -> {
                        BigDecimal rev = e.getValue().stream()
                                .map(this::getEffectiveRevenue)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("period", e.getKey().toString());
                        row.put("bookings", e.getValue().size());
                        row.put("revenue", rev);
                        return row;
                    })
                    .collect(Collectors.toList());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("from", from.toString());
        result.put("to", to.toString());
        result.put("groupBy", groupBy);
        result.put("totalRevenue", totalRevenue);
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
        long days = ChronoUnit.DAYS.between(from, to);

        long occupiedRoomDays = bookings.stream()
                .filter(b -> b.getRoom() != null)
                .mapToLong(b -> {
                    LocalDate start = b.getCheckInDate().isBefore(from) ? from : b.getCheckInDate();
                    LocalDate end = b.getCheckOutDate().isAfter(to) ? to : b.getCheckOutDate();
                    return ChronoUnit.DAYS.between(start, end);
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
                    .filter(b -> b.getRoom() != null)
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
