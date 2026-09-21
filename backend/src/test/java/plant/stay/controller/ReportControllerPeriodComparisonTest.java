package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import plant.stay.dto.response.PeriodComparisonReportResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.util.AuthUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class ReportControllerPeriodComparisonTest {

    private BookingRepository bookingRepository;
    private RoomRepository roomRepository;
    private InvoiceRepository invoiceRepository;
    private DepositRepository depositRepository;
    private PaymentRepository paymentRepository;
    private RoomTypeRepository roomTypeRepository;
    private AuthUtil authUtil;
    private ReportController controller;

    private User mockOwner;
    private User mockUnauthorizedStaff;
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

        mockUnauthorizedStaff = new User();
        mockUnauthorizedStaff.setId(2L);
        mockUnauthorizedStaff.setRole(Role.RECEPTIONIST);

        deluxeType = RoomType.builder()
                .id(1L)
                .name("Deluxe Double")
                .basePrice(new BigDecimal("1000000.00"))
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
    @DisplayName("Test 1: So sánh đa kỳ (Kỳ hiện tại vs Kỳ liền trước PoP vs Cùng kỳ năm trước YoY) chuẩn xác")
    public void testPeriodComparison_FullCalculation() {
        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        when(authUtil.getUserFromRequest(request)).thenReturn(mockOwner);
        when(roomRepository.findAllWithRoomType()).thenReturn(List.of(room101, room102));
        when(roomTypeRepository.findAll()).thenReturn(List.of(deluxeType, standardType));

        LocalDate curFrom = LocalDate.of(2026, 9, 1);
        LocalDate curTo = LocalDate.of(2026, 9, 30);
        LocalDate prevFrom = LocalDate.of(2026, 8, 1);
        LocalDate prevTo = LocalDate.of(2026, 8, 31);
        LocalDate yoyFrom = LocalDate.of(2025, 9, 1);
        LocalDate yoyTo = LocalDate.of(2025, 9, 30);

        // Booking kỳ hiện tại (Tháng 9/2026): 2 phòng x 30 ngày = 60 đêm phòng sẵn có
        // b1: 10 đêm Deluxe = 10,000,000 đ
        // b2: 20 đêm Standard = 10,000,000 đ
        // Tổng đêm = 30 đêm -> Công suất = 30 / 60 = 50.0%
        // Tổng doanh thu = 20,000,000 đ
        Booking bCur1 = Booking.builder()
                .id(1001L)
                .room(room101)
                .roomType(deluxeType)
                .status(BookingStatus.CHECKED_OUT)
                .actualPrice(new BigDecimal("10000000.00"))
                .checkInDate(LocalDate.of(2026, 9, 1))
                .checkOutDate(LocalDate.of(2026, 9, 11))
                .build();

        Booking bCur2 = Booking.builder()
                .id(1002L)
                .room(room102)
                .roomType(standardType)
                .status(BookingStatus.CHECKED_OUT)
                .actualPrice(new BigDecimal("10000000.00"))
                .checkInDate(LocalDate.of(2026, 9, 5))
                .checkOutDate(LocalDate.of(2026, 9, 25))
                .build();

        // Booking kỳ liền trước (Tháng 8/2026): 2 phòng x 31 ngày = 62 đêm phòng sẵn có
        // b3: 15 đêm = 12,000,000 đ -> Công suất = 15 / 62 = 24.19%
        Booking bPrev = Booking.builder()
                .id(901L)
                .room(room101)
                .roomType(deluxeType)
                .status(BookingStatus.CHECKED_OUT)
                .actualPrice(new BigDecimal("12000000.00"))
                .checkInDate(LocalDate.of(2026, 8, 1))
                .checkOutDate(LocalDate.of(2026, 8, 16))
                .build();

        // Booking cùng kỳ năm trước (Tháng 9/2025): 2 phòng x 30 ngày = 60 đêm phòng sẵn có
        // b4: 10 đêm = 8,000,000 đ -> Công suất = 10 / 60 = 16.67%
        Booking bYoy = Booking.builder()
                .id(801L)
                .room(room102)
                .roomType(standardType)
                .status(BookingStatus.CHECKED_OUT)
                .actualPrice(new BigDecimal("8000000.00"))
                .checkInDate(LocalDate.of(2025, 9, 1))
                .checkOutDate(LocalDate.of(2025, 9, 11))
                .build();

        when(bookingRepository.findCheckedOutBetween(curFrom, curTo)).thenReturn(List.of(bCur1, bCur2));
        when(bookingRepository.findCheckedOutBetween(prevFrom, prevTo)).thenReturn(List.of(bPrev));
        when(bookingRepository.findCheckedOutBetween(yoyFrom, yoyTo)).thenReturn(List.of(bYoy));

        ResponseEntity<PeriodComparisonReportResponse> response = controller.periodComparison(
                curFrom, curTo, "month", "both", request
        );

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        PeriodComparisonReportResponse body = response.getBody();
        assertNotNull(body);

        // 1. Kiểm tra PeriodInfo
        assertEquals("Tháng 09/2026", body.getCurrentPeriod().getLabel());
        assertEquals("Tháng 08/2026", body.getPreviousPeriod().getLabel());
        assertEquals("Cùng kỳ năm 2025", body.getSamePeriodLastYear().getLabel());

        // 2. Kiểm tra Metrics kỳ hiện tại
        assertEquals(new BigDecimal("20000000.00"), body.getCurrentMetrics().getRoomRevenue());
        assertEquals(2, body.getCurrentMetrics().getTotalBookings());
        assertEquals(30, body.getCurrentMetrics().getSoldRoomNights());
        assertEquals(60, body.getCurrentMetrics().getAvailableRoomNights());
        assertEquals(50.0, body.getCurrentMetrics().getOccupancyRate());

        // 3. Kiểm tra Metrics kỳ trước
        assertEquals(new BigDecimal("12000000.00"), body.getPreviousMetrics().getRoomRevenue());
        assertEquals(1, body.getPreviousMetrics().getTotalBookings());
        assertEquals(15, body.getPreviousMetrics().getSoldRoomNights());

        // 4. Kiểm tra PoP Comparison: Doanh thu tăng từ 12tr lên 20tr (+66.67%)
        assertNotNull(body.getPopComparison());
        assertEquals(new BigDecimal("8000000.00"), body.getPopComparison().getTotalRevenueDiff());
        assertEquals(66.67, body.getPopComparison().getTotalRevenueGrowthRate());
        assertTrue(body.getPopComparison().getOccupancyRateDiff() > 0);

        // 5. Kiểm tra YoY Comparison: Doanh thu tăng từ 8tr lên 20tr (+150.0%)
        assertNotNull(body.getYoyComparison());
        assertEquals(new BigDecimal("12000000.00"), body.getYoyComparison().getTotalRevenueDiff());
        assertEquals(150.0, body.getYoyComparison().getTotalRevenueGrowthRate());

        // 6. Kiểm tra Executive Insights & Room Types
        assertFalse(body.getExecutiveInsights().isEmpty());
        assertFalse(body.getRoomTypes().isEmpty());
        assertEquals(2, body.getRoomTypes().size());
    }

    @Test
    @DisplayName("Test 2: An toàn tuyệt đối không lỗi chia cho 0 khi kỳ trước không có dữ liệu")
    public void testPeriodComparison_ZeroSafe() {
        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        when(authUtil.getUserFromRequest(request)).thenReturn(mockOwner);
        when(roomRepository.findAllWithRoomType()).thenReturn(List.of(room101));
        when(roomTypeRepository.findAll()).thenReturn(List.of(deluxeType));

        LocalDate curFrom = LocalDate.of(2026, 9, 1);
        LocalDate curTo = LocalDate.of(2026, 9, 5);

        Booking bCur = Booking.builder()
                .id(2001L)
                .room(room101)
                .roomType(deluxeType)
                .status(BookingStatus.CHECKED_OUT)
                .actualPrice(new BigDecimal("5000000.00"))
                .checkInDate(LocalDate.of(2026, 9, 1))
                .checkOutDate(LocalDate.of(2026, 9, 6))
                .build();

        when(bookingRepository.findCheckedOutBetween(curFrom, curTo)).thenReturn(List.of(bCur));
        when(bookingRepository.findCheckedOutBetween(any(), any())).thenAnswer(invocation -> {
            LocalDate f = invocation.getArgument(0);
            if (f.equals(curFrom)) return List.of(bCur);
            return List.of(); // Kỳ trước và cùng kỳ năm ngoái trống
        });

        ResponseEntity<PeriodComparisonReportResponse> response = controller.periodComparison(
                curFrom, curTo, "custom", "both", request
        );

        assertNotNull(response);
        PeriodComparisonReportResponse body = response.getBody();
        assertNotNull(body);
        assertEquals(100.0, body.getPopComparison().getTotalRevenueGrowthRate());
        assertEquals(100.0, body.getYoyComparison().getTotalRevenueGrowthRate());
    }

    @Test
    @DisplayName("Test 3: Kiểm tra phân quyền truy cập (Staff không có quyền sẽ ném UnauthorizedException)")
    public void testPeriodComparison_Unauthorized() {
        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        when(authUtil.getUserFromRequest(request)).thenReturn(mockUnauthorizedStaff);

        LocalDate curFrom = LocalDate.of(2026, 9, 1);
        LocalDate curTo = LocalDate.of(2026, 9, 30);

        assertThrows(UnauthorizedException.class, () ->
                controller.periodComparison(curFrom, curTo, "month", "both", request)
        );
    }

    @Test
    @DisplayName("Test 4: Xuất báo cáo CSV UTF-8 BOM so sánh chỉ số với kỳ trước đầy đủ các phần")
    public void testExportCsv_PeriodComparison() {
        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        when(authUtil.getUserFromRequest(request)).thenReturn(mockOwner);
        when(roomRepository.findAllWithRoomType()).thenReturn(List.of(room101));
        when(roomTypeRepository.findAll()).thenReturn(List.of(deluxeType));

        LocalDate curFrom = LocalDate.of(2026, 9, 1);
        LocalDate curTo = LocalDate.of(2026, 9, 30);

        when(bookingRepository.findCheckedOutBetween(any(), any())).thenReturn(List.of());

        ResponseEntity<byte[]> response = controller.export(
                "period_comparison", curFrom, curTo, "month", request
        );

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        byte[] body = response.getBody();
        assertNotNull(body);
        String csvContent = new String(body, java.nio.charset.StandardCharsets.UTF_8);

        assertTrue(csvContent.startsWith("\uFEFF"));
        assertTrue(csvContent.contains("BÁO CÁO SO SÁNH CHỈ SỐ VỚI KỲ TRƯỚC"));
        assertTrue(csvContent.contains("1. BẢNG ĐỐI CHIẾU CHỈ SỐ HIỆU SUẤT TỔNG HỢP"));
        assertTrue(csvContent.contains("2. ĐỐI CHIẾU THEO TỪNG HẠNG PHÒNG"));
    }
}
