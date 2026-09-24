package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import plant.stay.dto.response.BestSellingServicesReportResponse;
import plant.stay.dto.response.BestSellingServicesReportResponse.*;
import plant.stay.model.*;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.BookingServiceUsageRepository;
import plant.stay.repository.ExtraServiceRepository;
import plant.stay.repository.InvoiceRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.service.impl.BestSellingServicesReportServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class BestSellingServicesReportTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingServiceUsageRepository bookingServiceUsageRepository;

    @Mock
    private ExtraServiceRepository extraServiceRepository;

    @Mock
    private RoomTypeRepository roomTypeRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @InjectMocks
    private BestSellingServicesReportServiceImpl reportService;

    private RoomType standardRoomType;
    private RoomType deluxeRoomType;
    private ExtraService breakfastService;
    private ExtraService laundryService;
    private ExtraService airportPickupService;
    private ExtraService autoSurchargeTemplate;

    @BeforeEach
    public void setUp() {
        standardRoomType = RoomType.builder().id(1L).name("Phòng Tiêu Chuẩn (Standard)").build();
        deluxeRoomType = RoomType.builder().id(2L).name("Phòng Deluxe").build();

        breakfastService = ExtraService.builder()
                .id(10L).name("Ăn sáng buffet").unitPrice(new BigDecimal("100000")).unit("lượt").active(true).build();

        laundryService = ExtraService.builder()
                .id(20L).name("Giặt là cao cấp").unitPrice(new BigDecimal("50000")).unit("kg").active(true).build();

        airportPickupService = ExtraService.builder()
                .id(30L).name("Đưa đón sân bay").unitPrice(new BigDecimal("300000")).unit("chuyến").active(true).build();

        autoSurchargeTemplate = ExtraService.builder()
                .id(99L).name("Phụ thu người ở ghép").unitPrice(new BigDecimal("150000")).unit("người/đêm").active(true).build();
    }

    @Test
    @DisplayName("Tính đúng số lượt, số lượng, doanh thu, tỷ trọng và giữ dịch vụ 0 lượt bán trong danh mục")
    public void testReportCalculatesCatalogAndAutoSurchargesCorrectly() {
        LocalDate from = LocalDate.of(2026, 9, 1);
        LocalDate to = LocalDate.of(2026, 9, 30);

        Booking b1 = Booking.builder().id(101L).roomType(standardRoomType).status(BookingStatus.CHECKED_OUT).build();
        Booking b2 = Booking.builder().id(102L).roomType(deluxeRoomType).status(BookingStatus.CHECKED_OUT).build();

        when(bookingRepository.findCheckedOutBetween(from, to)).thenReturn(Arrays.asList(b1, b2));

        Invoice inv1 = Invoice.builder().id(1L).booking(b1).status(InvoiceStatus.PAID).build();
        Invoice inv2 = Invoice.builder().id(2L).booking(b2).status(InvoiceStatus.PAID).build();

        when(invoiceRepository.findInvoicesCoveringBookingIds(anyList())).thenReturn(Arrays.asList(inv1, inv2));

        when(extraServiceRepository.findAll()).thenReturn(Arrays.asList(
                breakfastService, laundryService, airportPickupService, autoSurchargeTemplate));

        when(roomTypeRepository.findAll()).thenReturn(Arrays.asList(standardRoomType, deluxeRoomType));

        // Usages:
        // b1: 2 buffet sáng (2 x 100k = 200k), 1 phụ thu ở ghép (1 x 150k = 150k)
        BookingServiceUsage u1 = BookingServiceUsage.builder()
                .id(1L).booking(b1).extraService(breakfastService).quantity(2)
                .unitPriceSnapshot(new BigDecimal("100000")).isSystemMandatory(false).build();

        BookingServiceUsage u2 = BookingServiceUsage.builder()
                .id(2L).booking(b1).extraService(autoSurchargeTemplate).quantity(1)
                .unitPriceSnapshot(new BigDecimal("150000")).isSystemMandatory(true)
                .note("Phụ thu người ở ghép vượt tiêu chuẩn").build();

        // b2: 1 buffet sáng (1 x 100k = 100k), 3 kg giặt là (3 x 50k = 150k)
        BookingServiceUsage u3 = BookingServiceUsage.builder()
                .id(3L).booking(b2).extraService(breakfastService).quantity(1)
                .unitPriceSnapshot(new BigDecimal("100000")).isSystemMandatory(false).build();

        BookingServiceUsage u4 = BookingServiceUsage.builder()
                .id(4L).booking(b2).extraService(laundryService).quantity(3)
                .unitPriceSnapshot(new BigDecimal("50000")).isSystemMandatory(false).build();

        when(bookingServiceUsageRepository.findByBookingIdInWithDetails(anyList())).thenReturn(Arrays.asList(u1, u2, u3, u4));

        // Thực thi
        BestSellingServicesReportResponse response = reportService.getReport(from, to, null);

        // Kiểm tra
        assertNotNull(response);
        SurchargeReportSummary summary = response.getSummary();
        assertNotNull(summary);

        // Tổng doanh thu phụ thu: (200k + 100k) + 150k + 150k = 600k
        assertEquals(new BigDecimal("600000"), summary.getTotalSurchargeRevenue());
        assertEquals(new BigDecimal("450000"), summary.getCatalogServicesRevenue());
        assertEquals(new BigDecimal("150000"), summary.getAutoSurchargeRevenue());
        assertEquals(4, summary.getTotalSalesCount());
        assertEquals(7, summary.getTotalQuantity()); // 2 + 1 + 1 + 3 = 7

        // Số dịch vụ danh mục: 3 (không tính template phụ thu tự động)
        assertEquals(3, summary.getTotalCatalogServices());
        // Số dịch vụ 0 lượt bán: 1 (Đưa đón sân bay)
        assertEquals(1, summary.getZeroSalesCatalogServices());
        assertEquals("Ăn sáng buffet", summary.getTopServiceName());
        assertEquals(new BigDecimal("300000"), summary.getTopServiceRevenue());

        // Kiểm tra từng dịch vụ trong danh mục
        List<CatalogServiceItem> catalogServices = response.getCatalogServices();
        assertEquals(3, catalogServices.size());

        CatalogServiceItem buffet = catalogServices.stream().filter(c -> c.getServiceId().equals(10L)).findFirst().orElse(null);
        assertNotNull(buffet);
        assertEquals(2, buffet.getSalesCount());
        assertEquals(3, buffet.getTotalQuantity());
        assertEquals(new BigDecimal("300000"), buffet.getRevenue());
        assertEquals(new BigDecimal("50.00"), buffet.getRevenueShare()); // 300k / 600k * 100 = 50.00%
        assertEquals(2, buffet.getRoomTypeBreakdown().size()); // Cả Standard và Deluxe đều mua

        CatalogServiceItem laundry = catalogServices.stream().filter(c -> c.getServiceId().equals(20L)).findFirst().orElse(null);
        assertNotNull(laundry);
        assertEquals(1, laundry.getSalesCount());
        assertEquals(3, laundry.getTotalQuantity());
        assertEquals(new BigDecimal("150000"), laundry.getRevenue());
        assertEquals(new BigDecimal("25.00"), laundry.getRevenueShare());

        // Dịch vụ 0 lượt bán vẫn phải xuất hiện với số liệu 0
        CatalogServiceItem airport = catalogServices.stream().filter(c -> c.getServiceId().equals(30L)).findFirst().orElse(null);
        assertNotNull(airport);
        assertEquals(0, airport.getSalesCount());
        assertEquals(0, airport.getTotalQuantity());
        assertEquals(BigDecimal.ZERO, airport.getRevenue());
        assertEquals(new BigDecimal("0.00"), airport.getRevenueShare());

        // Kiểm tra nhóm Phụ thu tự động
        List<AutoSurchargeItem> autoSurcharges = response.getAutoSurcharges();
        assertEquals(1, autoSurcharges.size());
        AutoSurchargeItem extraPerson = autoSurcharges.get(0);
        assertEquals("EXTRA_PERSON", extraPerson.getCode());
        assertEquals(1, extraPerson.getSalesCount());
        assertEquals(1, extraPerson.getTotalQuantity());
        assertEquals(new BigDecimal("150000"), extraPerson.getRevenue());
        assertEquals(new BigDecimal("25.00"), extraPerson.getRevenueShare());

        // Kiểm tra so sánh giữa các loại phòng
        List<RoomTypeComparisonItem> roomTypeComparisons = response.getRoomTypeComparisons();
        assertEquals(2, roomTypeComparisons.size());
    }

    @Test
    @DisplayName("Dịch vụ thuộc booking chưa lập hóa đơn hoặc hóa đơn bị hủy thì không được tính vào doanh thu")
    public void testServicesWithoutInvoiceAreExcluded() {
        LocalDate from = LocalDate.of(2026, 9, 1);
        LocalDate to = LocalDate.of(2026, 9, 30);

        Booking b1 = Booking.builder().id(201L).roomType(standardRoomType).status(BookingStatus.CHECKED_OUT).build();
        when(bookingRepository.findCheckedOutBetween(from, to)).thenReturn(Collections.singletonList(b1));

        // Hóa đơn bị CANCELLED
        Invoice cancelledInv = Invoice.builder().id(999L).booking(b1).status(InvoiceStatus.CANCELLED).build();
        when(invoiceRepository.findInvoicesCoveringBookingIds(anyList())).thenReturn(Collections.singletonList(cancelledInv));

        when(extraServiceRepository.findAll()).thenReturn(Collections.singletonList(breakfastService));
        when(roomTypeRepository.findAll()).thenReturn(Collections.singletonList(standardRoomType));

        BestSellingServicesReportResponse response = reportService.getReport(from, to, null);

        assertNotNull(response);
        assertEquals(BigDecimal.ZERO, response.getSummary().getTotalSurchargeRevenue());
        assertEquals(0, response.getSummary().getTotalSalesCount());
        assertEquals(1, response.getSummary().getZeroSalesCatalogServices());
        assertEquals(BigDecimal.ZERO, response.getCatalogServices().get(0).getRevenue());
    }

    @Test
    @DisplayName("Lọc theo loại phòng chỉ tính doanh thu dịch vụ của loại phòng tương ứng")
    public void testFilterByRoomType() {
        LocalDate from = LocalDate.of(2026, 9, 1);
        LocalDate to = LocalDate.of(2026, 9, 30);

        Booking b1 = Booking.builder().id(301L).roomType(standardRoomType).status(BookingStatus.CHECKED_OUT).build();
        Booking b2 = Booking.builder().id(302L).roomType(deluxeRoomType).status(BookingStatus.CHECKED_OUT).build();

        when(bookingRepository.findCheckedOutBetween(from, to)).thenReturn(Arrays.asList(b1, b2));

        Invoice inv1 = Invoice.builder().id(11L).booking(b1).status(InvoiceStatus.PAID).build();
        Invoice inv2 = Invoice.builder().id(12L).booking(b2).status(InvoiceStatus.PAID).build();

        when(invoiceRepository.findInvoicesCoveringBookingIds(anyList())).thenReturn(Arrays.asList(inv1, inv2));

        when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(standardRoomType));
        when(roomTypeRepository.findAll()).thenReturn(Arrays.asList(standardRoomType, deluxeRoomType));
        when(extraServiceRepository.findAll()).thenReturn(Arrays.asList(breakfastService, laundryService));

        BookingServiceUsage u1 = BookingServiceUsage.builder()
                .id(1L).booking(b1).extraService(breakfastService).quantity(2)
                .unitPriceSnapshot(new BigDecimal("100000")).build();

        BookingServiceUsage u2 = BookingServiceUsage.builder()
                .id(2L).booking(b2).extraService(laundryService).quantity(5)
                .unitPriceSnapshot(new BigDecimal("50000")).build();

        when(bookingServiceUsageRepository.findByBookingIdInWithDetails(anyList())).thenReturn(Arrays.asList(u1, u2));

        // Lọc theo Standard Room (id = 1)
        BestSellingServicesReportResponse response = reportService.getReport(from, to, 1L);

        assertNotNull(response);
        assertEquals(1L, response.getSelectedRoomTypeId());
        assertEquals("Phòng Tiêu Chuẩn (Standard)", response.getSelectedRoomTypeName());
        // Chỉ có buffet của b1 (200k) được tính
        assertEquals(new BigDecimal("200000"), response.getSummary().getTotalSurchargeRevenue());
        assertEquals(1, response.getSummary().getTotalSalesCount());
        assertEquals(2, response.getSummary().getTotalQuantity());
    }

    @Test
    @DisplayName("Xuất CSV chứa đầy đủ các phân mục báo cáo phụ thu")
    public void testExportCsv() {
        LocalDate from = LocalDate.of(2026, 9, 1);
        LocalDate to = LocalDate.of(2026, 9, 30);

        when(bookingRepository.findCheckedOutBetween(from, to)).thenReturn(Collections.emptyList());
        when(extraServiceRepository.findAll()).thenReturn(Collections.singletonList(breakfastService));
        when(roomTypeRepository.findAll()).thenReturn(Collections.singletonList(standardRoomType));

        byte[] csvBytes = reportService.exportCsv(from, to);
        assertNotNull(csvBytes);
        assertTrue(csvBytes.length > 0);

        String csv = new String(csvBytes, java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(csv.contains("BÁO CÁO DỊCH VỤ PHỤ THU BÁN CHẠY"));
        assertTrue(csv.contains("1. TỔNG QUAN DOANH THU PHỤ THU"));
        assertTrue(csv.contains("2. DANH MỤC DỊCH VỤ PHỤ THU"));
        assertTrue(csv.contains("3. DÒNG PHỤ THU SINH TỰ ĐỘNG"));
        assertTrue(csv.contains("4. SO SÁNH TIÊU THỤ DỊCH VỤ"));
        assertTrue(csv.contains("Ăn sáng buffet"));
    }
}
