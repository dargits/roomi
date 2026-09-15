package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.NightlyPriceBreakdownResponse;
import plant.stay.model.RoomType;
import plant.stay.repository.RoomTypeRepository;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class PricingServiceTest {

    @Autowired
    private PricingService pricingService;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    private RoomType testRoomType;

    @BeforeEach
    void setUp() {
        testRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Suite Gia Đình Test")
                .basePrice(new BigDecimal("1000000"))
                .standardCapacity(2)
                .maxCapacity(4)
                .extraPersonChargePerNight(new BigDecimal("150000"))
                .maxChildAgeFree(6)
                .active(true)
                .build());
    }

    @Test
    @DisplayName("Tính giá chuẩn khi số khách bằng sức chứa tiêu chuẩn (Không phụ thu)")
    void testPriceBreakdownStandardCapacityNoSurcharge() {
        LocalDate checkIn = LocalDate.now().plusDays(1);
        LocalDate checkOut = checkIn.plusDays(2); // 2 nights

        NightlyPriceBreakdownResponse breakdown = pricingService.calculateBreakdown(
                testRoomType.getId(), checkIn, checkOut, 2, 0);

        assertNotNull(breakdown);
        assertEquals(2, breakdown.getTotalNights());
        assertEquals(2, breakdown.getStandardCapacity());
        assertEquals(4, breakdown.getMaxCapacity());
        assertEquals(2, breakdown.getGuestCount());
        assertEquals(0, breakdown.getExtraGuests());
        assertEquals(0, BigDecimal.ZERO.compareTo(breakdown.getTotalExtraCharge()));
        assertEquals(0, new BigDecimal("2000000").compareTo(breakdown.getTotalRoomPrice()));
        assertEquals(0, new BigDecimal("2000000").compareTo(breakdown.getGrandTotal()));
    }

    @Test
    @DisplayName("Tự động tính phụ thu thêm người khi số khách vượt sức chứa tiêu chuẩn")
    void testPriceBreakdownWithExtraPersonSurcharge() {
        LocalDate checkIn = LocalDate.now().plusDays(1);
        LocalDate checkOut = checkIn.plusDays(3); // 3 nights

        // 4 khách (vượt 2 khách so với tiêu chuẩn 2 người), 0 trẻ em
        NightlyPriceBreakdownResponse breakdown = pricingService.calculateBreakdown(
                testRoomType.getId(), checkIn, checkOut, 4, 0);

        assertNotNull(breakdown);
        assertEquals(3, breakdown.getTotalNights());
        assertEquals(4, breakdown.getGuestCount());
        assertEquals(2, breakdown.getExtraGuests()); // 4 - 2 = 2 khách vượt
        assertEquals(0, new BigDecimal("150000").compareTo(breakdown.getExtraPersonChargePerNight()));

        // Phụ thu: 2 người * 150.000 đ/đêm * 3 đêm = 900.000 đ
        BigDecimal expectedExtra = new BigDecimal("900000");
        assertEquals(0, expectedExtra.compareTo(breakdown.getTotalExtraCharge()));

        // Tổng cộng = 3.000.000 tiền phòng + 900.000 phụ thu = 3.900.000 đ
        BigDecimal expectedGrandTotal = new BigDecimal("3900000");
        assertEquals(0, expectedGrandTotal.compareTo(breakdown.getGrandTotal()));
    }

    @Test
    @DisplayName("Miễn phụ thu cho trẻ em theo quy định khi vượt sức chứa tiêu chuẩn")
    void testPriceBreakdownWithFreeChildren() {
        LocalDate checkIn = LocalDate.now().plusDays(1);
        LocalDate checkOut = checkIn.plusDays(2); // 2 nights

        // Tổng 4 người (2 người lớn + 2 trẻ em) -> Vượt 2 so với tiêu chuẩn 2, nhưng có 2 trẻ em miễn phí -> 0 khách phụ thu
        NightlyPriceBreakdownResponse breakdown = pricingService.calculateBreakdown(
                testRoomType.getId(), checkIn, checkOut, 4, 2);

        assertNotNull(breakdown);
        assertEquals(0, breakdown.getExtraGuests());
        assertEquals(0, BigDecimal.ZERO.compareTo(breakdown.getTotalExtraCharge()));
        assertEquals(0, new BigDecimal("2000000").compareTo(breakdown.getGrandTotal()));
    }

    @Test
    @DisplayName("Từ chối tính giá khi số khách vượt quá sức chứa tối đa của phòng")
    void testRejectWhenGuestCountExceedsMaxCapacity() {
        LocalDate checkIn = LocalDate.now().plusDays(1);
        LocalDate checkOut = checkIn.plusDays(1);

        // 5 khách trong khi MaxCapacity = 4
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            pricingService.calculateBreakdown(testRoomType.getId(), checkIn, checkOut, 5, 0);
        });

        assertTrue(ex.getMessage().contains("vượt quá sức chứa tối đa của phòng"));
    }
}
