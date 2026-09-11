package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import plant.stay.dto.response.NightlyPriceBreakdownResponse;
import plant.stay.dto.response.NightlyPriceDetailDto;
import plant.stay.model.*;
import plant.stay.repository.HolidayPriceRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.SeasonalPriceRepository;
import plant.stay.repository.WeekendPriceConfigRepository;
import plant.stay.service.impl.PricingServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PricingServiceTest {

    @Mock
    private WeekendPriceConfigRepository weekendPriceConfigRepository;

    @Mock
    private HolidayPriceRepository holidayPriceRepository;

    @Mock
    private SeasonalPriceRepository seasonalPriceRepository;

    @Mock
    private RoomTypeRepository roomTypeRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private PricingServiceImpl pricingService;

    private RoomType roomType;

    @BeforeEach
    void setUp() {
        roomType = RoomType.builder()
                .id(1L)
                .name("Phòng Tiêu Chuẩn")
                .basePrice(BigDecimal.valueOf(500000))
                .standardCapacity(2)
                .maxCapacity(3)
                .extraPersonChargePerNight(BigDecimal.valueOf(100000))
                .build();
    }

    @Test
    @DisplayName("NCL-02-CN-006: Ưu tiên 1 - Trùng cả Ngày lễ, Cuối tuần, Theo mùa -> Phải lấy Giá ngày lễ")
    void testPriority1_HolidayOverWeekendAndSeason() {
        // Thứ Bảy (Saturday), ngày 2026-09-02 (giả sử có cả lễ, cuối tuần, và mùa)
        LocalDate testDate = LocalDate.of(2026, 9, 5); // 2026-09-05 là Saturday

        // Cấu hình Ngày lễ: 1.500.000 đ
        HolidayPrice hp = HolidayPrice.builder()
                .id(10L)
                .roomType(roomType)
                .holidayName("Lễ Quốc khánh")
                .holidayDate(testDate)
                .pricePerNight(BigDecimal.valueOf(1500000))
                .active(true)
                .build();
        when(holidayPriceRepository.findFirstByRoomTypeIdAndHolidayDateAndActiveTrue(eq(1L), eq(testDate)))
                .thenReturn(Optional.of(hp));

        NightlyPriceDetailDto detail = pricingService.calculateNightPrice(roomType, testDate);

        assertNotNull(detail);
        assertEquals(BigDecimal.valueOf(1500000), detail.getAppliedPrice());
        assertEquals("HOLIDAY", detail.getPriceSource());
        assertTrue(detail.getSourceName().contains("Lễ Quốc khánh"));
    }

    @Test
    @DisplayName("NCL-02-CN-006: Ưu tiên 2 - Không có lễ, trùng Cuối tuần và Theo mùa -> Phải lấy Giá cuối tuần")
    void testPriority2_WeekendOverSeason() {
        LocalDate saturday = LocalDate.of(2026, 9, 5); // Saturday

        // Không có lễ
        when(holidayPriceRepository.findFirstByRoomTypeIdAndHolidayDateAndActiveTrue(eq(1L), eq(saturday)))
                .thenReturn(Optional.empty());

        // Có cấu hình cuối tuần: Friday, Saturday, Sunday = 800.000 đ
        WeekendPriceConfig wc = WeekendPriceConfig.builder()
                .id(20L)
                .roomType(roomType)
                .weekendDays("FRIDAY,SATURDAY,SUNDAY")
                .pricePerNight(BigDecimal.valueOf(800000))
                .active(true)
                .build();
        when(weekendPriceConfigRepository.findFirstByRoomTypeIdAndActiveTrue(eq(1L)))
                .thenReturn(Optional.of(wc));

        NightlyPriceDetailDto detail = pricingService.calculateNightPrice(roomType, saturday);

        assertNotNull(detail);
        assertEquals(BigDecimal.valueOf(800000), detail.getAppliedPrice());
        assertEquals("WEEKEND", detail.getPriceSource());
        assertTrue(detail.getSourceName().contains("cuối tuần"));
    }

    @Test
    @DisplayName("NCL-02-CN-006: Ưu tiên 3 - Ngày thường (không phải cuối tuần, không có lễ) nhưng trong Mùa -> Phải lấy Giá theo mùa")
    void testPriority3_SeasonalPrice() {
        LocalDate wednesday = LocalDate.of(2026, 9, 2); // Wednesday

        // Không có lễ
        when(holidayPriceRepository.findFirstByRoomTypeIdAndHolidayDateAndActiveTrue(eq(1L), eq(wednesday)))
                .thenReturn(Optional.empty());

        // Có cuối tuần nhưng chỉ áp dụng Friday, Saturday, Sunday
        WeekendPriceConfig wc = WeekendPriceConfig.builder()
                .id(20L)
                .roomType(roomType)
                .weekendDays("FRIDAY,SATURDAY,SUNDAY")
                .pricePerNight(BigDecimal.valueOf(800000))
                .active(true)
                .build();
        when(weekendPriceConfigRepository.findFirstByRoomTypeIdAndActiveTrue(eq(1L)))
                .thenReturn(Optional.of(wc));

        // Có giá theo mùa: 650.000 đ
        SeasonalPrice sp = SeasonalPrice.builder()
                .id(30L)
                .roomType(roomType)
                .startDate(LocalDate.of(2026, 9, 1))
                .endDate(LocalDate.of(2026, 9, 30))
                .pricePerNight(BigDecimal.valueOf(650000))
                .build();
        when(seasonalPriceRepository.findByRoomTypeAndDate(eq(1L), eq(wednesday)))
                .thenReturn(List.of(sp));

        NightlyPriceDetailDto detail = pricingService.calculateNightPrice(roomType, wednesday);

        assertNotNull(detail);
        assertEquals(BigDecimal.valueOf(650000), detail.getAppliedPrice());
        assertEquals("SEASONAL", detail.getPriceSource());
    }

    @Test
    @DisplayName("NCL-02-CN-006: Ưu tiên 4 - Không có lễ, không phải cuối tuần, không có mùa -> Phải lấy Giá cơ bản")
    void testPriority4_BasePrice() {
        LocalDate tuesday = LocalDate.of(2026, 9, 1); // Tuesday

        when(holidayPriceRepository.findFirstByRoomTypeIdAndHolidayDateAndActiveTrue(eq(1L), eq(tuesday)))
                .thenReturn(Optional.empty());
        when(weekendPriceConfigRepository.findFirstByRoomTypeIdAndActiveTrue(eq(1L)))
                .thenReturn(Optional.empty());
        when(seasonalPriceRepository.findByRoomTypeAndDate(eq(1L), eq(tuesday)))
                .thenReturn(List.of());

        NightlyPriceDetailDto detail = pricingService.calculateNightPrice(roomType, tuesday);

        assertNotNull(detail);
        assertEquals(BigDecimal.valueOf(500000), detail.getAppliedPrice());
        assertEquals("BASE", detail.getPriceSource());
        assertEquals("Giá cơ bản loại phòng", detail.getSourceName());
    }

    @Test
    @DisplayName("NCL-02-CN-006: Bảng chi tiết giá từng đêm tính chính xác từng đêm riêng biệt")
    void testCalculateBreakdown_MultiNightWithDifferentPrices() {
        // Kỳ lưu trú 2 đêm: Thứ Năm (2026-09-03) và Thứ Sáu (2026-09-04)
        LocalDate checkIn = LocalDate.of(2026, 9, 3); // Thursday
        LocalDate checkOut = LocalDate.of(2026, 9, 5); // Checkout Saturday -> 2 nights: Thursday & Friday

        when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(roomType));

        // Không có lễ trong cả 2 đêm
        when(holidayPriceRepository.findFirstByRoomTypeIdAndHolidayDateAndActiveTrue(eq(1L), any()))
                .thenReturn(Optional.empty());

        // Cấu hình cuối tuần: Thứ 6, Thứ 7 = 900.000 đ
        WeekendPriceConfig wc = WeekendPriceConfig.builder()
                .roomType(roomType)
                .weekendDays("FRIDAY,SATURDAY")
                .pricePerNight(BigDecimal.valueOf(900000))
                .active(true)
                .build();
        when(weekendPriceConfigRepository.findFirstByRoomTypeIdAndActiveTrue(eq(1L)))
                .thenReturn(Optional.of(wc));

        // Mùa: không có
        when(seasonalPriceRepository.findByRoomTypeAndDate(eq(1L), any()))
                .thenReturn(List.of());

        NightlyPriceBreakdownResponse breakdown = pricingService.calculateBreakdown(1L, checkIn, checkOut, 2, 0);

        assertNotNull(breakdown);
        assertEquals(2, breakdown.getTotalNights());
        assertEquals(2, breakdown.getNightlyDetails().size());

        // Đêm 1: Thứ Năm -> Giá cơ bản = 500.000 đ
        NightlyPriceDetailDto night1 = breakdown.getNightlyDetails().get(0);
        assertEquals(LocalDate.of(2026, 9, 3), night1.getDate());
        assertEquals(BigDecimal.valueOf(500000), night1.getAppliedPrice());
        assertEquals("BASE", night1.getPriceSource());

        // Đêm 2: Thứ Sáu -> Giá cuối tuần = 900.000 đ
        NightlyPriceDetailDto night2 = breakdown.getNightlyDetails().get(1);
        assertEquals(LocalDate.of(2026, 9, 4), night2.getDate());
        assertEquals(BigDecimal.valueOf(900000), night2.getAppliedPrice());
        assertEquals("WEEKEND", night2.getPriceSource());

        // Tổng tiền 2 đêm = 500.000 + 900.000 = 1.400.000 đ
        assertEquals(BigDecimal.valueOf(1400000), breakdown.getTotalRoomPrice());
        assertEquals(BigDecimal.valueOf(1400000), breakdown.getGrandTotal());
    }
}
