package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.PriceSuggestionConfigRequest;
import plant.stay.dto.response.PriceSuggestionConfigResponse;
import plant.stay.dto.response.PriceSuggestionDto;
import plant.stay.dto.response.PriceSuggestionResponse;
import plant.stay.exception.BusinessException;
import plant.stay.model.*;
import plant.stay.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class PriceSuggestionServiceTest {

    @Autowired
    private PriceSuggestionService priceSuggestionService;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private HotelSettingRepository hotelSettingRepository;

    @Autowired
    private DismissedPriceSuggestionRepository dismissedPriceSuggestionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GuestRepository guestRepository;

    private User ownerUser;
    private RoomType testRoomType;
    private Room room1;
    private Room room2;
    private Guest testGuest;

    @BeforeEach
    void setUp() {
        ownerUser = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.OWNER)
                .findFirst()
                .orElseGet(() -> userRepository.save(User.builder()
                        .account("testowner")
                        .name("Chủ Cơ Sở Test")
                        .password("pass")
                        .role(Role.OWNER)
                        .active(true)
                        .build()));

        testGuest = guestRepository.save(Guest.builder()
                .name("Khách Hàng Test")
                .phone("0987654321")
                .idNumber("123456789012")
                .build());

        testRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe Lake View")
                .basePrice(new BigDecimal("1200000"))
                .standardCapacity(2)
                .maxCapacity(3)
                .active(true)
                .build());

        room1 = roomRepository.save(Room.builder()
                .roomNumber("T101")
                .roomType(testRoomType)
                .floor("1")
                .status(RoomStatus.AVAILABLE)
                .build());

        room2 = roomRepository.save(Room.builder()
                .roomNumber("T102")
                .roomType(testRoomType)
                .floor("1")
                .status(RoomStatus.AVAILABLE)
                .build());
    }

    @Test
    @DisplayName("Gợi ý CÂN NHẮC TĂNG GIÁ khi mức lấp đầy vượt ngưỡng trên (cháy phòng)")
    void testSuggestIncreasePriceWhenOccupancyHigh() {
        LocalDate today = LocalDate.now();
        LocalDate targetDate = today.plusDays(10);

        // Đặt kín tất cả các phòng vào ngày targetDate để công suất đạt 100% (cháy phòng)
        List<Room> allRooms = roomRepository.findAll();
        for (Room r : allRooms) {
            bookingRepository.save(Booking.builder()
                    .guest(testGuest)
                    .room(r)
                    .roomType(r.getRoomType())
                    .checkInDate(targetDate)
                    .checkOutDate(targetDate.plusDays(1))
                    .status(BookingStatus.CONFIRMED)
                    .build());
        }

        PriceSuggestionResponse res = priceSuggestionService.getPriceSuggestions(30, true, ownerUser);

        assertNotNull(res);
        assertTrue(res.getTotalRooms() >= 2);

        PriceSuggestionDto daySuggestion = res.getSuggestions().stream()
                .filter(s -> s.getTargetDate().equals(targetDate))
                .findFirst()
                .orElse(null);

        assertNotNull(daySuggestion);
        assertTrue(daySuggestion.getCurrentOccupancyRate() >= 80.0);
        assertEquals("INCREASE_PRICE", daySuggestion.getSuggestionType());
        assertTrue(daySuggestion.getRecommendation().contains("tăng giá"));
        assertEquals(0, daySuggestion.getVacantRooms());
        assertEquals(10, daySuggestion.getDaysRemaining());
    }

    @Test
    @DisplayName("Gợi ý CÂN NHẮC GIẢM GIÁ HOẶC MỞ KÊNH khi công suất thấp và cận ngày đón khách")
    void testSuggestDecreasePriceWhenOccupancyLowAndImminent() {
        LocalDate today = LocalDate.now();
        LocalDate imminentDate = today.plusDays(2); // Cận ngày (<= 7 ngày)

        // Không có booking nào cho imminentDate -> occupancy = 0%
        PriceSuggestionResponse res = priceSuggestionService.getPriceSuggestions(30, true, ownerUser);

        assertNotNull(res);
        PriceSuggestionDto imminentSuggestion = res.getSuggestions().stream()
                .filter(s -> s.getTargetDate().equals(imminentDate))
                .findFirst()
                .orElse(null);

        assertNotNull(imminentSuggestion);
        assertEquals(0.0, imminentSuggestion.getCurrentOccupancyRate());
        assertEquals(2, imminentSuggestion.getDaysRemaining());
        assertEquals("DECREASE_PRICE_OR_CHANNELS", imminentSuggestion.getSuggestionType());
        assertTrue(imminentSuggestion.getRecommendation().contains("giảm giá") || imminentSuggestion.getRecommendation().contains("mở bán thêm kênh"));
    }

    @Test
    @DisplayName("Đánh giá mức độ tin cậy thấp kèm ghi chú rõ ràng khi chưa đủ 1 năm dữ liệu lịch sử")
    void testLowConfidenceNoteWhenLessThanOneYearData() {
        PriceSuggestionResponse res = priceSuggestionService.getPriceSuggestions(30, true, ownerUser);

        assertNotNull(res);
        if (!res.isHasFullYearData()) {
            PriceSuggestionDto first = res.getSuggestions().get(0);
            assertEquals("LOW", first.getConfidenceLevel());
            assertTrue(first.getConfidenceNote().contains("chưa đủ 1 năm"));
            assertNull(first.getReferenceOccupancyRate());
        }
    }

    @Test
    @DisplayName("Chủ cơ sở bỏ qua gợi ý và gợi ý đó không hiện lại nữa")
    void testDismissSuggestion() {
        LocalDate targetDate = LocalDate.now().plusDays(3);

        // Bỏ qua gợi ý
        priceSuggestionService.dismissSuggestion(targetDate, ownerUser);

        // Khi lấy danh sách active (includeDismissed = false), ngày đó không được xuất hiện
        PriceSuggestionResponse activeRes = priceSuggestionService.getPriceSuggestions(30, false, ownerUser);
        boolean foundInActive = activeRes.getSuggestions().stream()
                .anyMatch(s -> s.getTargetDate().equals(targetDate));
        assertFalse(foundInActive, "Gợi ý đã bỏ qua không được xuất hiện trong danh sách hoạt động");

        // Khi lấy danh sách đầy đủ (includeDismissed = true), ngày đó xuất hiện và cờ dismissed = true
        PriceSuggestionResponse allRes = priceSuggestionService.getPriceSuggestions(30, true, ownerUser);
        PriceSuggestionDto dismissedDto = allRes.getSuggestions().stream()
                .filter(s -> s.getTargetDate().equals(targetDate))
                .findFirst()
                .orElse(null);
        assertNotNull(dismissedDto);
        assertTrue(dismissedDto.isDismissed());

        // Khôi phục gợi ý
        priceSuggestionService.restoreSuggestion(targetDate, ownerUser);
        PriceSuggestionResponse restoredRes = priceSuggestionService.getPriceSuggestions(30, true, ownerUser);
        PriceSuggestionDto restoredDto = restoredRes.getSuggestions().stream()
                .filter(s -> s.getTargetDate().equals(targetDate))
                .findFirst()
                .orElse(null);
        assertNotNull(restoredDto);
        assertFalse(restoredDto.isDismissed());
    }

    @Test
    @DisplayName("Cập nhật ngưỡng cấu hình hợp lệ và từ chối khi ngưỡng trên <= ngưỡng dưới")
    void testUpdateConfigurationValidation() {
        // Cập nhật hợp lệ
        PriceSuggestionConfigRequest validReq = PriceSuggestionConfigRequest.builder()
                .highOccupancyThreshold(85.0)
                .lowOccupancyThreshold(25.0)
                .imminentDaysThreshold(5)
                .build();

        PriceSuggestionConfigResponse updated = priceSuggestionService.updateSuggestionConfig(validReq, ownerUser);
        assertEquals(85.0, updated.getHighOccupancyThreshold());
        assertEquals(25.0, updated.getLowOccupancyThreshold());
        assertEquals(5, updated.getImminentDaysThreshold());

        // Từ chối khi ngưỡng trên <= ngưỡng dưới
        PriceSuggestionConfigRequest invalidReq = PriceSuggestionConfigRequest.builder()
                .highOccupancyThreshold(30.0)
                .lowOccupancyThreshold(50.0)
                .imminentDaysThreshold(5)
                .build();

        assertThrows(BusinessException.class, () -> {
            priceSuggestionService.updateSuggestionConfig(invalidReq, ownerUser);
        });
    }

    @Test
    @DisplayName("Hệ thống tuyệt đối không tự ý thay đổi giá phòng của cơ sở")
    void testStrictRuleDoesNotAutoChangePrice() {
        BigDecimal originalBasePrice = testRoomType.getBasePrice();

        // Chạy rà soát gợi ý giá
        priceSuggestionService.getPriceSuggestions(30, false, ownerUser);

        // Giá phòng trong cơ sở dữ liệu phải giữ nguyên vẹn 100%
        RoomType refreshed = roomTypeRepository.findById(testRoomType.getId()).orElseThrow();
        assertEquals(0, originalBasePrice.compareTo(refreshed.getBasePrice()), "Giá cơ sở của loại phòng phải không đổi");
    }
}
