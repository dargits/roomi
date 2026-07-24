package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.dto.request.SeasonalRateRequest;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.RoomType;
import roomi.dev.model.SeasonalRate;
import roomi.dev.repository.RoomTypeRepository;
import roomi.dev.repository.SeasonalRateRepository;
import roomi.dev.service.SeasonalRateService;

import roomi.dev.dto.response.PriceLookupResponse;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SeasonalRateServiceImpl implements SeasonalRateService {

    private final SeasonalRateRepository seasonalRateRepository;
    private final RoomTypeRepository roomTypeRepository;

    @Override
    public SeasonalRate createSeasonalRate(SeasonalRateRequest request) {
        validateDateRange(request);

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại phòng", ErrorCode.INVALID_INPUT));

        // Kiểm tra chồng lấn khoảng thời gian (excludeId = -1 nghĩa là không loại trừ bản ghi nào)
        boolean overlap = seasonalRateRepository.existsOverlap(
                request.getRoomTypeId(), request.getStartDate(), request.getEndDate(), -1L);
        if (overlap) {
            throw new BusinessException("Khoảng thời gian bị chồng lấn với cấu hình giá đã tồn tại", ErrorCode.INVALID_INPUT);
        }

        SeasonalRate seasonalRate = SeasonalRate.builder()
                .roomType(roomType)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .price(request.getPrice())
                .build();

        return seasonalRateRepository.save(seasonalRate);
    }

    @Override
    public SeasonalRate updateSeasonalRate(Long id, SeasonalRateRequest request) {
        SeasonalRate seasonalRate = seasonalRateRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy cấu hình giá theo mùa", ErrorCode.INVALID_INPUT));

        validateDateRange(request);

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại phòng", ErrorCode.INVALID_INPUT));

        // Kiểm tra chồng lấn, loại trừ chính bản ghi đang update
        boolean overlap = seasonalRateRepository.existsOverlap(
                request.getRoomTypeId(), request.getStartDate(), request.getEndDate(), id);
        if (overlap) {
            throw new BusinessException("Khoảng thời gian bị chồng lấn với cấu hình giá đã tồn tại", ErrorCode.INVALID_INPUT);
        }

        seasonalRate.setRoomType(roomType);
        seasonalRate.setStartDate(request.getStartDate());
        seasonalRate.setEndDate(request.getEndDate());
        seasonalRate.setPrice(request.getPrice());

        return seasonalRateRepository.save(seasonalRate);
    }

    @Override
    public void deleteSeasonalRate(Long id) {
        SeasonalRate seasonalRate = seasonalRateRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy cấu hình giá theo mùa", ErrorCode.INVALID_INPUT));
        seasonalRateRepository.delete(seasonalRate);
    }

    @Override
    public List<SeasonalRate> getAllSeasonalRates() {
        return seasonalRateRepository.findAll();
    }

    @Override
    public List<SeasonalRate> getSeasonalRatesByRoomType(Long roomTypeId) {
        roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại phòng", ErrorCode.INVALID_INPUT));
        return seasonalRateRepository.findByRoomTypeId(roomTypeId);
    }

    @Override
    public SeasonalRate getSeasonalRateById(Long id) {
        return seasonalRateRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy cấu hình giá theo mùa", ErrorCode.INVALID_INPUT));
    }

    @Override
    public PriceLookupResponse getPriceLookup(Long roomTypeId, LocalDate date) {
        RoomType roomType = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại phòng", ErrorCode.INVALID_INPUT));

        List<SeasonalRate> rates = seasonalRateRepository.findByRoomTypeId(roomTypeId);

        SeasonalRate activeRate = rates.stream()
                .filter(r -> !date.isBefore(r.getStartDate()) && !date.isAfter(r.getEndDate()))
                .findFirst()
                .orElse(null);

        if (activeRate != null) {
            return PriceLookupResponse.builder()
                    .roomTypeId(roomTypeId)
                    .roomTypeName(roomType.getName())
                    .date(date)
                    .price(activeRate.getPrice())
                    .basePrice(roomType.getBasePrice())
                    .isSeasonalRate(true)
                    .priceSource("SEASONAL_RATE")
                    .build();
        } else {
            return PriceLookupResponse.builder()
                    .roomTypeId(roomTypeId)
                    .roomTypeName(roomType.getName())
                    .date(date)
                    .price(roomType.getBasePrice())
                    .basePrice(roomType.getBasePrice())
                    .isSeasonalRate(false)
                    .priceSource("BASE_PRICE")
                    .build();
        }
    }

    // ------------------------------------------------------------------ helpers

    private void validateDateRange(SeasonalRateRequest request) {
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new BusinessException("startDate không được sau endDate", ErrorCode.INVALID_INPUT);
        }
        if (request.getStartDate().equals(request.getEndDate())) {
            throw new BusinessException("startDate và endDate không được trùng nhau", ErrorCode.INVALID_INPUT);
        }
    }
}
