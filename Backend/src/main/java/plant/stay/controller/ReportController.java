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
import plant.stay.model.User;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.InvoiceRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.util.AuthUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    // Báo cáo công suất phòng
    @GetMapping("/occupancy")
    public ResponseEntity<?> occupancy(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletRequest request) {
        checkOwner(request);
        long totalRooms = roomRepository.count();
        List<Booking> bookings = bookingRepository.findForCalendar(from, to);
        long days = java.time.temporal.ChronoUnit.DAYS.between(from, to);
        long occupiedRoomDays = bookings.stream()
                .filter(b -> b.getRoom() != null)
                .mapToLong(b -> {
                    LocalDate start = b.getCheckInDate().isBefore(from) ? from : b.getCheckInDate();
                    LocalDate end = b.getCheckOutDate().isAfter(to) ? to : b.getCheckOutDate();
                    return java.time.temporal.ChronoUnit.DAYS.between(start, end);
                }).sum();
        double occupancyRate = totalRooms * days > 0 ? (double) occupiedRoomDays / (totalRooms * days) * 100 : 0;

        return ResponseEntity.ok(Map.of(
                "from", from, "to", to,
                "totalRooms", totalRooms, "days", days,
                "occupiedRoomDays", occupiedRoomDays,
                "occupancyRate", String.format("%.2f%%", occupancyRate)
        ));
    }

    // Báo cáo doanh thu
    @GetMapping("/revenue")
    public ResponseEntity<?> revenue(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "day") String groupBy,
            HttpServletRequest request) {
        checkFinance(request);
        List<Booking> bookings = bookingRepository.findCheckedOutBetween(from, to);
        BigDecimal totalRevenue = bookings.stream()
                .map(b -> b.getActualPrice() != null ? b.getActualPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ResponseEntity.ok(Map.of(
                "from", from, "to", to,
                "groupBy", groupBy,
                "totalRevenue", totalRevenue,
                "bookingCount", bookings.size()
        ));
    }

    // Dashboard tổng quan
    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(HttpServletRequest request) {
        checkOwner(request);
        LocalDate today = LocalDate.now();
        long totalRooms = roomRepository.count();
        long todayCheckin = bookingRepository.findTodayCheckinCheckout(today).stream()
                .filter(b -> b.getCheckInDate().equals(today)).count();
        long todayCheckout = bookingRepository.findTodayCheckinCheckout(today).stream()
                .filter(b -> b.getCheckOutDate().equals(today)).count();
        List<Booking> monthBookings = bookingRepository.findCheckedOutBetween(
                today.withDayOfMonth(1), today);
        BigDecimal monthRevenue = monthBookings.stream()
                .map(b -> b.getActualPrice() != null ? b.getActualPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ResponseEntity.ok(Map.of(
                "totalRooms", totalRooms,
                "todayCheckin", todayCheckin,
                "todayCheckout", todayCheckout,
                "monthRevenue", monthRevenue
        ));
    }

    // Export CSV
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
                            b.getActualPrice() != null ? b.getActualPrice() : "")));
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
        if (user == null || user.getRole() != Role.OWNER)
            throw new UnauthorizedException("Chỉ OWNER mới có quyền xem báo cáo");
    }

    private void checkFinance(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ACCOUNTANT))
            throw new UnauthorizedException("Không có quyền xem báo cáo doanh thu");
    }
}
