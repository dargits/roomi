package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import plant.stay.dto.request.SeasonalPriceRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.SeasonalPriceResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.RoomType;
import plant.stay.model.SeasonalPrice;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.SeasonalPriceRepository;
import plant.stay.service.impl.SeasonalPriceServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class SeasonalPriceServiceImplTest {

    private SeasonalPriceRepository seasonalPriceRepository;
    private RoomTypeRepository roomTypeRepository;
    private SeasonalPriceServiceImpl seasonalPriceService;

    private RoomType mockRoomType;

    @BeforeEach
    public void setUp() {
        seasonalPriceRepository = mock(SeasonalPriceRepository.class);
        roomTypeRepository = mock(RoomTypeRepository.class);
        seasonalPriceService = new SeasonalPriceServiceImpl(seasonalPriceRepository, roomTypeRepository);

        mockRoomType = new RoomType();
        mockRoomType.setId(1L);
        mockRoomType.setName("Deluxe Ocean View");
    }

    @Test
    @DisplayName("Test: create seasonal price successfully")
    public void testCreateSuccess() {
        when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(mockRoomType));
        when(seasonalPriceRepository.findOverlapping(eq(1L), any(), any(), eq(-1L))).thenReturn(Collections.emptyList());

        SeasonalPriceRequest req = new SeasonalPriceRequest();
        req.setStartDate(LocalDate.of(2026, 6, 1));
        req.setEndDate(LocalDate.of(2026, 8, 31));
        req.setPricePerNight(new BigDecimal("1500000"));

        when(seasonalPriceRepository.save(any(SeasonalPrice.class))).thenAnswer(inv -> {
            SeasonalPrice sp = inv.getArgument(0);
            sp.setId(10L);
            return sp;
        });

        SeasonalPriceResponse res = seasonalPriceService.create(1L, req);

        assertNotNull(res);
        assertEquals(10L, res.getId());
        assertEquals(new BigDecimal("1500000"), res.getPricePerNight());
        verify(seasonalPriceRepository, times(1)).save(any(SeasonalPrice.class));
    }

    @Test
    @DisplayName("Test: create throws IllegalArgumentException when endDate <= startDate")
    public void testCreateInvalidDates() {
        when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(mockRoomType));

        SeasonalPriceRequest req = new SeasonalPriceRequest();
        req.setStartDate(LocalDate.of(2026, 6, 10));
        req.setEndDate(LocalDate.of(2026, 6, 5)); // Invalid
        req.setPricePerNight(new BigDecimal("1500000"));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            seasonalPriceService.create(1L, req);
        });

        assertTrue(ex.getMessage().contains("Ngày kết thúc phải sau"));
    }

    @Test
    @DisplayName("Test: create throws IllegalArgumentException when dates overlap")
    public void testCreateOverlap() {
        when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(mockRoomType));

        SeasonalPrice existing = new SeasonalPrice();
        existing.setId(5L);
        when(seasonalPriceRepository.findOverlapping(eq(1L), any(), any(), eq(-1L))).thenReturn(List.of(existing));

        SeasonalPriceRequest req = new SeasonalPriceRequest();
        req.setStartDate(LocalDate.of(2026, 6, 1));
        req.setEndDate(LocalDate.of(2026, 6, 15));
        req.setPricePerNight(new BigDecimal("1500000"));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            seasonalPriceService.create(1L, req);
        });

        assertTrue(ex.getMessage().contains("bị trùng"));
    }

    @Test
    @DisplayName("Test: delete seasonal price successfully")
    public void testDeleteSuccess() {
        when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(mockRoomType));

        SeasonalPrice price = new SeasonalPrice();
        price.setId(20L);
        when(seasonalPriceRepository.findById(20L)).thenReturn(Optional.of(price));

        MessageResponse res = seasonalPriceService.delete(1L, 20L);

        assertNotNull(res);
        assertTrue(res.getMessage().contains("Đã xóa"));
        verify(seasonalPriceRepository, times(1)).delete(price);
    }
}
