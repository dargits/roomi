package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.util.AuthUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class ReportControllerAdrRevparTest {

    private BookingRepository bookingRepository;
    private RoomRepository roomRepository;
    private InvoiceRepository invoiceRepository;
    private DepositRepository depositRepository;
    private PaymentRepository paymentRepository;
    private RoomTypeRepository roomTypeRepository;
    private AuthUtil authUtil;
    private ReportController controller;

    private User mockOwner;
    private RoomType deluxeType;
    private RoomType standardType;
    private Room room101;
    private Room room102;

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

        mockOwner = new User();
        mockOwner.setId(1L);
        mockOwner.setRole(Role.OWNER);

        deluxeType = RoomType.builder()
                .id(1L)
                .name("Deluxe Double")
                .basePrice(new BigDecimal("800000.00"))
                .build();

        standardType = RoomType.builder()
                .id(2L)
                .name("Standard Single")
                .basePrice(new BigDecimal("500000.00"))
                .build();

        room101 = Room.builder()
                .id(101L)
                .roomNumber("101")
                .floor("1")
                .roomType(deluxeType)
                .build();

        room102 = Room.builder()
                .id(102L)
                .roomNumber("102")
                .floor("1")
                .roomType(standardType)
                .build();
    }

    @Test
    @DisplayName("Test 1: Tính toán chính xác ADR, RevPAR và phân rã dữ liệu (Summary, Timeline, RoomType, Room)")
    public void testAdrRevparCalculation() {
        when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);
        when(roomRepository.findAll()).thenReturn(List.of(room101, room102));
        when(roomRepository.findAllWithRoomType()).thenReturn(List.of(room101, room102));
        when(roomTypeRepository.findAll()).thenReturn(List.of(deluxeType, standardType));

        LocalDate from = LocalDate.of(2026, 9, 1);
        LocalDate to = LocalDate.of(2026, 9, 10); // 10 ngày (từ ngày 1 đến ngày 10)

        // Booking 1: Phòng 101 (Deluxe), 3 đêm (1 -> 4), Doanh thu 2.400.000 đ
        Booking b1 = Booking.builder()
                .id(1L)
                .room(room101)
                .roomType(deluxeType)
                .checkInDate(LocalDate.of(2026, 9, 1))
                .checkOutDate(LocalDate.of(2026, 9, 4))
                .actualPrice(new BigDecimal("2400000.00"))
                .status(BookingStatus.CHECKED_OUT)
                .build();

        // Booking 2: Phòng 102 (Standard), 2 đêm (5 -> 7), Doanh thu 1.000.000 đ
        Booking b2 = Booking.builder()
                .id(2L)
                .room(room102)
                .roomType(standardType)
                .checkInDate(LocalDate.of(2026, 9, 5))
                .checkOutDate(LocalDate.of(2026, 9, 7))
                .actualPrice(new BigDecimal("1000000.00"))
                .status(BookingStatus.CHECKED_OUT)
                .build();

        when(bookingRepository.findCheckedOutBetween(from, to)).thenReturn(List.of(b1, b2));

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        ResponseEntity<?> response = controller.adrRevpar(from, to, "day", request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();

        // Kiểm tra Summary
        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) body.get("summary");
        assertNotNull(summary);

        // Tổng doanh thu = 2.400.000 + 1.000.000 = 3.400.000
        assertEquals(new BigDecimal("3400000.00"), summary.get("totalRevenue"));
        // Tổng đêm phòng bán = 3 + 2 = 5
        assertEquals(5L, summary.get("totalSoldNights"));
        // Tổng số phòng = 2, Số ngày = 10 -> Tổng đêm sẵn có = 20
        assertEquals(20L, summary.get("totalAvailableNights"));
        assertEquals(2L, summary.get("totalRooms"));
        assertEquals(10L, summary.get("days"));

        // ADR = 3.400.000 / 5 = 680.000
        assertEquals(new BigDecimal("680000.00"), summary.get("adr"));
        // RevPAR = 3.400.000 / 20 = 170.000
        assertEquals(new BigDecimal("170000.00"), summary.get("revpar"));
        // Công suất = 5 / 20 * 100 = 25%
        assertEquals(25.0, summary.get("occupancyRate"));
        assertEquals(2, summary.get("bookingCount"));

        // Top highlights
        assertEquals("101", summary.get("topRoomNumber")); // 2.400.000 > 1.000.000
        assertEquals("Deluxe Double", summary.get("topRoomTypeName"));

        // Kiểm tra Room Type Breakdown
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> roomTypeRows = (List<Map<String, Object>>) body.get("roomTypeRows");
        assertEquals(2, roomTypeRows.size());

        Map<String, Object> deluxeRow = roomTypeRows.stream()
                .filter(r -> r.get("roomTypeName").equals("Deluxe Double"))
                .findFirst().orElseThrow();
        assertEquals(new BigDecimal("2400000.00"), deluxeRow.get("revenue"));
        assertEquals(3L, deluxeRow.get("soldNights"));
        assertEquals(new BigDecimal("800000.00"), deluxeRow.get("adr")); // 2.400.000 / 3 = 800.000
        assertEquals(new BigDecimal("240000.00"), deluxeRow.get("revpar")); // 2.400.000 / 10 = 240.000

        // Kiểm tra Room Breakdown
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> roomRows = (List<Map<String, Object>>) body.get("roomRows");
        assertEquals(2, roomRows.size());
    }

    @Test
    @DisplayName("Test 2: Nhóm dữ liệu theo Tháng (groupBy = month)")
    public void testAdrRevparGroupByMonth() {
        when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);
        when(roomRepository.findAll()).thenReturn(List.of(room101, room102));
        when(roomRepository.findAllWithRoomType()).thenReturn(List.of(room101, room102));
        when(roomTypeRepository.findAll()).thenReturn(List.of(deluxeType, standardType));

        LocalDate from = LocalDate.of(2026, 8, 1);
        LocalDate to = LocalDate.of(2026, 9, 30);

        Booking b1 = Booking.builder()
                .id(1L)
                .room(room101)
                .roomType(deluxeType)
                .checkInDate(LocalDate.of(2026, 8, 10))
                .checkOutDate(LocalDate.of(2026, 8, 15))
                .actualPrice(new BigDecimal("4000000.00"))
                .status(BookingStatus.CHECKED_OUT)
                .build();

        Booking b2 = Booking.builder()
                .id(2L)
                .room(room102)
                .roomType(standardType)
                .checkInDate(LocalDate.of(2026, 9, 1))
                .checkOutDate(LocalDate.of(2026, 9, 5))
                .actualPrice(new BigDecimal("2000000.00"))
                .status(BookingStatus.CHECKED_OUT)
                .build();

        when(bookingRepository.findCheckedOutBetween(from, to)).thenReturn(List.of(b1, b2));

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        ResponseEntity<?> response = controller.adrRevpar(from, to, "month", request);

        assertEquals(200, response.getStatusCode().value());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> timelineRows = (List<Map<String, Object>>) body.get("timelineRows");

        assertEquals(2, timelineRows.size());
        assertEquals("2026-08", timelineRows.get(0).get("period"));
        assertEquals("2026-09", timelineRows.get(1).get("period"));
    }

    @Test
    @DisplayName("Test 3: Người dùng không có quyền (RECEPTIONIST) bị từ chối")
    public void testUnauthorizedRoleForbidden() {
        User receptionist = new User();
        receptionist.setId(2L);
        receptionist.setRole(Role.RECEPTIONIST);

        when(authUtil.getUserFromRequest(any())).thenReturn(receptionist);

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        LocalDate from = LocalDate.of(2026, 9, 1);
        LocalDate to = LocalDate.of(2026, 9, 10);

        assertThrows(UnauthorizedException.class, () -> {
            controller.adrRevpar(from, to, "day", request);
        });
    }

    @Test
    @DisplayName("Test 4: Xuất file CSV cho báo cáo ADR & RevPAR")
    public void testExportAdrRevparCsv() {
        when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);
        when(roomRepository.findAll()).thenReturn(List.of(room101, room102));
        when(roomRepository.findAllWithRoomType()).thenReturn(List.of(room101, room102));

        LocalDate from = LocalDate.of(2026, 9, 1);
        LocalDate to = LocalDate.of(2026, 9, 10);

        Booking b1 = Booking.builder()
                .id(1L)
                .room(room101)
                .roomType(deluxeType)
                .checkInDate(LocalDate.of(2026, 9, 1))
                .checkOutDate(LocalDate.of(2026, 9, 4))
                .actualPrice(new BigDecimal("2400000.00"))
                .status(BookingStatus.CHECKED_OUT)
                .build();

        when(bookingRepository.findCheckedOutBetween(from, to)).thenReturn(List.of(b1));

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        ResponseEntity<byte[]> response = controller.export("adr_revpar", from, to, request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());

        String csvContent = new String(response.getBody(), java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(csvContent.contains("BÁO CÁO GIÁ BÁN TRUNG BÌNH (ADR) VÀ DOANH THU TRÊN MỖI PHÒNG (RevPAR)"));
        assertTrue(csvContent.contains("101"));
        assertTrue(csvContent.contains("Deluxe Double"));
    }
}
