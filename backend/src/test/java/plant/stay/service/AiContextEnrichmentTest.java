package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import plant.stay.dto.response.PriceSuggestionDto;
import plant.stay.dto.response.PriceSuggestionResponse;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.impl.AiChatService;
import plant.stay.service.impl.AiPriceAnalysisService;
import plant.stay.service.impl.GeminiService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

public class AiContextEnrichmentTest {

    private GeminiService geminiService;
    private HotelSettingRepository hotelSettingRepository;
    private RoomTypeRepository roomTypeRepository;
    private RoomRepository roomRepository;
    private BookingRepository bookingRepository;
    private CancellationPolicyRepository cancellationPolicyRepository;
    private WeekendPriceConfigRepository weekendPriceConfigRepository;
    private ExtraServiceRepository extraServiceRepository;

    private AiChatService aiChatService;
    private AiPriceAnalysisService aiPriceAnalysisService;

    @BeforeEach
    public void setup() {
        geminiService = Mockito.mock(GeminiService.class);
        hotelSettingRepository = Mockito.mock(HotelSettingRepository.class);
        roomTypeRepository = Mockito.mock(RoomTypeRepository.class);
        roomRepository = Mockito.mock(RoomRepository.class);
        bookingRepository = Mockito.mock(BookingRepository.class);
        cancellationPolicyRepository = Mockito.mock(CancellationPolicyRepository.class);
        weekendPriceConfigRepository = Mockito.mock(WeekendPriceConfigRepository.class);
        extraServiceRepository = Mockito.mock(ExtraServiceRepository.class);

        aiChatService = new AiChatService(
                geminiService,
                hotelSettingRepository,
                roomTypeRepository,
                roomRepository,
                bookingRepository,
                cancellationPolicyRepository,
                weekendPriceConfigRepository,
                extraServiceRepository
        );

        aiPriceAnalysisService = new AiPriceAnalysisService(
                geminiService,
                hotelSettingRepository,
                roomTypeRepository,
                roomRepository,
                bookingRepository,
                weekendPriceConfigRepository
        );

        HotelSetting setting = HotelSetting.builder()
                .id(1L)
                .propertyName("Stay Away Hotel")
                .address("123 Biển Xanh, Đà Nẵng")
                .phone("0365224245")
                .email("lienhe@stayaway.vn")
                .defaultCheckinTime(LocalTime.of(14, 0))
                .defaultCheckoutTime(LocalTime.of(12, 0))
                .build();
        when(hotelSettingRepository.findById(1L)).thenReturn(Optional.of(setting));
    }

    @Test
    @DisplayName("AI Chat Context: Nạp đầy đủ thông tin phòng, giá cuối tuần, dịch vụ phụ thu, chính sách cọc & tra cứu trực tuyến")
    public void testAiChatContext_EnrichedWithServicesAndLookup() {
        RoomType standard = RoomType.builder()
                .id(1L)
                .name("Phòng Tiêu Chuẩn")
                .basePrice(new BigDecimal("500000"))
                .standardCapacity(2)
                .maxCapacity(3)
                .extraPersonChargePerNight(new BigDecimal("150000"))
                .maxChildAgeFree(6)
                .amenitiesDescription("Wifi tốc độ cao, TV, Điều hòa")
                .build();
        when(roomTypeRepository.findAll()).thenReturn(List.of(standard));

        WeekendPriceConfig weekendConfig = WeekendPriceConfig.builder()
                .id(1L)
                .roomType(standard)
                .weekendDays("T6-T7")
                .pricePerNight(new BigDecimal("600000"))
                .active(true)
                .build();
        when(weekendPriceConfigRepository.findAllActive()).thenReturn(List.of(weekendConfig));

        ExtraService buffet = ExtraService.builder()
                .id(10L)
                .name("Buffet sáng tự chọn")
                .unitPrice(new BigDecimal("50000"))
                .unit("suất")
                .description("Hơn 30 món Âu Á")
                .active(true)
                .build();
        when(extraServiceRepository.findAllByActiveTrue()).thenReturn(List.of(buffet));

        CancellationPolicy cp = CancellationPolicy.builder()
                .id(1L)
                .freeCancelHours(24)
                .penaltyPercent(new BigDecimal("50"))
                .build();
        when(cancellationPolicyRepository.findAll()).thenReturn(List.of(cp));

        String context = aiChatService.buildHotelContext(LocalDate.now(), LocalDate.now().plusDays(2), "Tra cứu mã đặt phòng");

        // Kiểm tra các thông tin cốt lõi
        assertTrue(context.contains("Stay Away Hotel"));
        assertTrue(context.contains("0365224245"));
        assertTrue(context.contains("Phòng Tiêu Chuẩn"));
        assertTrue(context.contains("500.000 VNĐ"));
        assertTrue(context.contains("600.000 VNĐ"));
        assertTrue(context.contains("Buffet sáng tự chọn"));
        assertTrue(context.contains("50.000 VNĐ / suất"));
        assertTrue(context.contains("Tra cứu Đặt phòng & Hóa đơn"));
        assertTrue(context.contains("/booking-detail/"));
        assertTrue(context.contains("14:00"));
        assertTrue(context.contains("12:00"));
    }

    @Test
    @DisplayName("AI Chat Context: Xử lý thông minh khi tin nhắn chứa mã đặt phòng và số điện thoại khớp")
    public void testAiChatContext_WithMatchedBookingCodeAndPhone() {
        Guest guest = Guest.builder().id(5L).name("Nguyễn Thùy Linh").phone("0924118729").build();
        Booking booking = Booking.builder()
                .id(188L)
                .guest(guest)
                .checkInDate(LocalDate.of(2026, 9, 28))
                .checkOutDate(LocalDate.of(2026, 9, 29))
                .status(BookingStatus.CONFIRMED)
                .expectedPrice(new BigDecimal("700000"))
                .build();
        when(bookingRepository.findById(188L)).thenReturn(Optional.of(booking));

        String context = aiChatService.buildHotelContext(null, null, "Kiểm tra giúp mình mã đơn #188 sđt 0924118729");

        assertTrue(context.contains("#188"));
        assertTrue(context.contains("Nguyễn Thùy Linh"));
        assertTrue(context.contains("đã cung cấp đúng số điện thoại"));
        assertTrue(context.contains("/booking-detail/188?tab=info&phone=0924118729"));
    }

    @Test
    @DisplayName("AI Price Analysis Context: Nạp đầy đủ phân rã hạng phòng, giá sàn/trần an toàn và nguyên tắc định giá")
    public void testAiPriceAnalysisContext_EnrichedWithBreakdownAndGuardrails() {
        RoomType standard = RoomType.builder()
                .id(1L)
                .name("Phòng Tiêu Chuẩn")
                .basePrice(new BigDecimal("500000"))
                .build();
        RoomType superior = RoomType.builder()
                .id(2L)
                .name("Phòng Cao Cấp")
                .basePrice(new BigDecimal("700000"))
                .build();
        when(roomTypeRepository.findAll()).thenReturn(List.of(standard, superior));
        when(roomRepository.count()).thenReturn(10L);

        PriceSuggestionDto day1 = PriceSuggestionDto.builder()
                .targetDate(LocalDate.now().plusDays(1))
                .dayOfWeek("Thứ Bảy")
                .daysRemaining(1)
                .totalRooms(10)
                .occupiedRooms(8)
                .vacantRooms(2)
                .currentOccupancyRate(80.0)
                .highThreshold(75.0)
                .lowThreshold(35.0)
                .suggestionType("INCREASE_PRICE")
                .roomTypeBreakdown(List.of(
                        PriceSuggestionDto.RoomTypeOccupancyDto.builder()
                                .roomTypeId(1L)
                                .roomTypeName("Phòng Tiêu Chuẩn")
                                .totalRooms(6)
                                .occupiedRooms(6)
                                .vacantRooms(0)
                                .basePrice(new BigDecimal("500000"))
                                .build(),
                        PriceSuggestionDto.RoomTypeOccupancyDto.builder()
                                .roomTypeId(2L)
                                .roomTypeName("Phòng Cao Cấp")
                                .totalRooms(4)
                                .occupiedRooms(2)
                                .vacantRooms(2)
                                .basePrice(new BigDecimal("700000"))
                                .build()
                ))
                .build();

        PriceSuggestionResponse response = PriceSuggestionResponse.builder()
                .suggestions(List.of(day1))
                .totalRooms(10)
                .highOccupancyThreshold(75.0)
                .lowOccupancyThreshold(35.0)
                .imminentDaysThreshold(3)
                .increaseCount(1)
                .decreaseCount(0)
                .build();

        String overallAnalysis = aiPriceAnalysisService.analyzeOverall(response);
        // Do geminiService được mock nên verify context
        Mockito.verify(geminiService).chat(Mockito.argThat(ctx -> {
            boolean hasFloor = ctx.contains("Giá sàn an toàn");
            boolean hasCeiling = ctx.contains("Giá trần cao điểm");
            boolean hasBreakdown = ctx.contains("Phân rã nhu cầu và tỷ lệ lấp đầy theo từng Hạng phòng");
            boolean hasSurgeRules = ctx.contains("Nguyên tắc Surge Pricing");
            return hasFloor && hasCeiling && hasBreakdown && hasSurgeRules;
        }), Mockito.anyString());
    }
}
