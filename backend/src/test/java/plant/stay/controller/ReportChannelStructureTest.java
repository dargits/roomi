package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.util.AuthUtil;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class ReportChannelStructureTest {

    private BookingRepository bookingRepository;
    private RoomRepository roomRepository;
    private InvoiceRepository invoiceRepository;
    private DepositRepository depositRepository;
    private PaymentRepository paymentRepository;
    private RoomTypeRepository roomTypeRepository;
    private AuthUtil authUtil;
    private ReportController controller;

    private User mockUser;

    @BeforeEach
    public void setUp() {
        bookingRepository = Mockito.mock(BookingRepository.class);
        roomRepository = Mockito.mock(RoomRepository.class);
        invoiceRepository = Mockito.mock(InvoiceRepository.class);
        depositRepository = Mockito.mock(DepositRepository.class);
        paymentRepository = Mockito.mock(PaymentRepository.class);
        roomTypeRepository = Mockito.mock(RoomTypeRepository.class);
        authUtil = Mockito.mock(AuthUtil.class);

        controller = new ReportController(
                bookingRepository,
                roomRepository,
                invoiceRepository,
                depositRepository,
                paymentRepository,
                roomTypeRepository,
                authUtil
        );

        mockUser = User.builder()
                .id(1L)
                .name("Chủ Khách Sạn")
                .role(Role.OWNER)
                .build();
        when(authUtil.getUserFromRequest(any())).thenReturn(mockUser);
    }

    @Test
    @DisplayName("Tính toán chính xác cơ cấu doanh thu theo kênh từ hóa đơn, tỷ lệ hủy, no-show và chất lượng dữ liệu")
    public void testChannelReportCalculation() {
        LocalDate from = LocalDate.of(2026, 9, 1);
        LocalDate to = LocalDate.of(2026, 9, 30);

        Guest guest = Guest.builder().id(10L).name("Khách A").build();
        RoomType rt = RoomType.builder().id(1L).name("Deluxe").build();

        // Booking 1: WALKIN, CHECKED_OUT, 2 đêm, Hóa đơn 2.000.000 đ
        Booking b1 = Booking.builder()
                .id(101L).guest(guest).roomType(rt).source("WALKIN")
                .checkInDate(from).checkOutDate(from.plusDays(2))
                .status(BookingStatus.CHECKED_OUT)
                .expectedPrice(BigDecimal.valueOf(2500000)) // Phải lấy theo hóa đơn (2.000.000), KHÔNG lấy expectedPrice
                .build();
        Invoice inv1 = Invoice.builder().id(501L).booking(b1).totalAmount(BigDecimal.valueOf(2000000)).build();
        when(invoiceRepository.findByBookingId(101L)).thenReturn(Optional.of(inv1));

        // Booking 2: WALKIN, CANCELLED
        Booking b2 = Booking.builder()
                .id(102L).guest(guest).roomType(rt).source("WALKIN")
                .checkInDate(from.plusDays(3)).checkOutDate(from.plusDays(5))
                .status(BookingStatus.CANCELLED)
                .build();

        // Booking 3: PHONE, NO_SHOW
        Booking b3 = Booking.builder()
                .id(103L).guest(guest).roomType(rt).source("PHONE")
                .checkInDate(from.plusDays(5)).checkOutDate(from.plusDays(6))
                .status(BookingStatus.NO_SHOW)
                .build();

        // Booking 4: SOCIAL, CHECKED_OUT, 1 đêm, Hóa đơn 1.500.000 đ
        Booking b4 = Booking.builder()
                .id(104L).guest(guest).roomType(rt).source("SOCIAL")
                .checkInDate(from.plusDays(7)).checkOutDate(from.plusDays(8))
                .status(BookingStatus.CHECKED_OUT)
                .build();
        Invoice inv4 = Invoice.builder().id(504L).booking(b4).totalAmount(BigDecimal.valueOf(1500000)).build();
        when(invoiceRepository.findByBookingId(104L)).thenReturn(Optional.of(inv4));

        // Booking 5: ONLINE, CHECKED_OUT, 3 đêm, Hóa đơn 3.000.000 đ
        Booking b5 = Booking.builder()
                .id(105L).guest(guest).roomType(rt).source("ONLINE")
                .checkInDate(from.plusDays(10)).checkOutDate(from.plusDays(13))
                .status(BookingStatus.CHECKED_OUT)
                .build();
        Invoice inv5 = Invoice.builder().id(505L).booking(b5).totalAmount(BigDecimal.valueOf(3000000)).build();
        when(invoiceRepository.findByBookingId(105L)).thenReturn(Optional.of(inv5));

        // Booking 6: AIRBNB (SIMULATION), CHECKED_IN, 1 đêm
        Booking b6 = Booking.builder()
                .id(106L).guest(guest).roomType(rt).source("AIRBNB")
                .checkInDate(from.plusDays(14)).checkOutDate(from.plusDays(15))
                .status(BookingStatus.CHECKED_IN)
                .build();

        // Booking 7: Chưa có nguồn (null) -> UNKNOWN
        Booking b7 = Booking.builder()
                .id(107L).guest(guest).roomType(rt).source(null)
                .checkInDate(from.plusDays(20)).checkOutDate(from.plusDays(22))
                .status(BookingStatus.CONFIRMED)
                .build();

        when(bookingRepository.findBookingsForChannelReport(from, to))
                .thenReturn(List.of(b1, b2, b3, b4, b5, b6, b7));

        HttpServletRequest req = Mockito.mock(HttpServletRequest.class);
        ResponseEntity<?> resp = controller.channelReport(from, to, req);
        assertNotNull(resp);
        assertEquals(200, resp.getStatusCode().value());

        Map<String, Object> body = (Map<String, Object>) resp.getBody();
        assertNotNull(body);

        Map<String, Object> summary = (Map<String, Object>) body.get("summary");
        List<Map<String, Object>> rows = (List<Map<String, Object>>) body.get("rows");

        // Kiểm tra tổng quan (Summary)
        assertEquals(7L, summary.get("totalBookings"));
        BigDecimal totalRev = (BigDecimal) summary.get("totalRevenue");
        // Doanh thu từ hóa đơn: 2.000.000 + 1.500.000 + 3.000.000 = 6.500.000
        assertEquals(BigDecimal.valueOf(6500000), totalRev);

        assertEquals(1L, summary.get("totalCancelled"));
        assertEquals(1L, summary.get("totalNoShow"));
        assertEquals(1L, summary.get("unknownBookings"));

        // 6 nhóm kênh chuẩn
        assertEquals(6, rows.size());

        // Kiểm tra WALKIN: 2 booking, 1 cancel (50%), doanh thu 2.000.000
        Map<String, Object> walkinRow = rows.stream().filter(r -> "WALKIN".equals(r.get("channelKey"))).findFirst().orElseThrow();
        assertEquals(2L, walkinRow.get("totalBookings"));
        assertEquals(1L, walkinRow.get("cancelledBookings"));
        assertEquals(50.0, walkinRow.get("cancellationRate"));
        assertEquals(BigDecimal.valueOf(2000000), walkinRow.get("revenue"));

        // Kiểm tra PHONE: 1 booking, 1 no-show (100%), doanh thu 0
        Map<String, Object> phoneRow = rows.stream().filter(r -> "PHONE".equals(r.get("channelKey"))).findFirst().orElseThrow();
        assertEquals(1L, phoneRow.get("totalBookings"));
        assertEquals(1L, phoneRow.get("noShowBookings"));
        assertEquals(100.0, phoneRow.get("noShowRate"));
        assertEquals(BigDecimal.ZERO, phoneRow.get("revenue"));

        // Kiểm tra SIMULATION: AIRBNB được gom vào SIMULATION
        Map<String, Object> simRow = rows.stream().filter(r -> "SIMULATION".equals(r.get("channelKey"))).findFirst().orElseThrow();
        assertEquals(1L, simRow.get("totalBookings"));

        // Kiểm tra UNKNOWN: booking không rõ nguồn
        Map<String, Object> unkRow = rows.stream().filter(r -> "UNKNOWN".equals(r.get("channelKey"))).findFirst().orElseThrow();
        assertEquals(1L, unkRow.get("totalBookings"));
    }

    @Test
    @DisplayName("Xuất báo cáo cơ cấu kênh ra CSV chuẩn UTF-8 BOM")
    public void testChannelReportExportCsv() {
        LocalDate from = LocalDate.of(2026, 9, 1);
        LocalDate to = LocalDate.of(2026, 9, 30);

        Guest guest = Guest.builder().id(10L).name("Khách Test").build();
        Booking b1 = Booking.builder()
                .id(201L).guest(guest).source("WALKIN")
                .checkInDate(from).checkOutDate(from.plusDays(1))
                .status(BookingStatus.CHECKED_OUT)
                .build();
        Invoice inv = Invoice.builder().id(601L).booking(b1).totalAmount(BigDecimal.valueOf(1000000)).build();
        when(invoiceRepository.findByBookingId(201L)).thenReturn(Optional.of(inv));

        when(bookingRepository.findBookingsForChannelReport(from, to)).thenReturn(List.of(b1));

        HttpServletRequest req = Mockito.mock(HttpServletRequest.class);
        ResponseEntity<byte[]> resp = controller.export("channels", from, to, req);

        assertNotNull(resp);
        assertEquals(200, resp.getStatusCode().value());
        assertNotNull(resp.getBody());

        String csvStr = new String(resp.getBody(), StandardCharsets.UTF_8);
        assertTrue(csvStr.startsWith("\uFEFF"), "File CSV phải bắt đầu bằng UTF-8 BOM");
        assertTrue(csvStr.contains("BÁO CÁO CƠ CẤU ĐẶT PHÒNG THEO KÊNH"));
        assertTrue(csvStr.contains("Kênh tại quầy"));
        assertTrue(csvStr.contains("WALKIN"));
        assertTrue(csvStr.contains("TỔNG CỘNG"));
    }
}
