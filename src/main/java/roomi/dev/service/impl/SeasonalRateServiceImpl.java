package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.dto.request.SeasonalRateRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.PriceLookupResponse;
import roomi.dev.dto.response.SeasonalRateResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.RoomType;
import roomi.dev.model.SeasonalRate;
import roomi.dev.repository.RoomTypeRepository;
import roomi.dev.repository.SeasonalRateRepository;
import roomi.dev.service.SeasonalRateService;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeasonalRateServiceImpl implements SeasonalRateService {

    private final SeasonalRateRepository seasonalRateRepository;
    private final RoomTypeRepository roomTypeRepository;

    @Override
    public BaseResponse<List<SeasonalRateResponse>> getAllSeasonalRates() {
        List<SeasonalRate> seasonalRates = seasonalRateRepository.findAll();
        return BaseResponse.<List<SeasonalRateResponse>>builder()
                .mess("Thành công")
                .data(seasonalRates.stream()
                        .map(this::toSeasonalRateResponse)
                        .collect(Collectors.toList()))
                .build();
    }

    @Override
    public BaseResponse<List<SeasonalRateResponse>> getSeasonalRatesByRoomType(Long roomTypeId) {
        // Kiểm tra room type tồn tại
        if (!roomTypeRepository.existsById(roomTypeId)) {
            throw new BusinessException("Loại phòng không tồn tại", ErrorCode.ROOM_TYPE_NOT_FOUND);
        }

        List<SeasonalRate> seasonalRates = seasonalRateRepository.findByRoomTypeId(roomTypeId);
        return BaseResponse.<List<SeasonalRateResponse>>builder()
                .mess("Thành công")
                .data(seasonalRates.stream()
                        .map(this::toSeasonalRateResponse)
                        .collect(Collectors.toList()))
                .build();
    }

    @Override
    public BaseResponse<SeasonalRateResponse> getSeasonalRateById(Long id) {
        SeasonalRate seasonalRate = seasonalRateRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Giá theo mùa không tồn tại", ErrorCode.SEASONAL_RATE_NOT_FOUND));

        return BaseResponse.<SeasonalRateResponse>builder()
                .mess("Thành công")
                .data(toSeasonalRateResponse(seasonalRate))
                .build();
    }

    @Override
    public BaseResponse<SeasonalRateResponse> createSeasonalRate(SeasonalRateRequest request) {
        // Validate input
        validateSeasonalRateRequest(request);

        // Kiểm tra room type tồn tại
        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new BusinessException("Loại phòng không tồn tại", ErrorCode.ROOM_TYPE_NOT_FOUND));

        // Kiểm tra không có khoảng thời gian trùng lặp
        List<SeasonalRate> overlappingRates = seasonalRateRepository.findOverlappingRates(
                request.getRoomTypeId(), request.getStartDate(), request.getEndDate());
        
        if (!overlappingRates.isEmpty()) {
            throw new BusinessException("Khoảng thời gian bị trùng lặp với giá đã có", ErrorCode.DATE_RANGE_OVERLAP);
        }

        SeasonalRate seasonalRate = SeasonalRate.builder()
                .roomType(roomType)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .price(request.getPrice())
                .build();

        seasonalRate = seasonalRateRepository.save(seasonalRate);

        return BaseResponse.<SeasonalRateResponse>builder()
                .mess("Tạo giá theo mùa thành công")
                .data(toSeasonalRateResponse(seasonalRate))
                .build();
    }

    @Override
    public BaseResponse<SeasonalRateResponse> updateSeasonalRate(Long id, SeasonalRateRequest request) {
        // Validate input
        validateSeasonalRateRequest(request);

        SeasonalRate existingRate = seasonalRateRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Giá theo mùa không tồn tại", ErrorCode.SEASONAL_RATE_NOT_FOUND));

        // Kiểm tra room type tồn tại
        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new BusinessException("Loại phòng không tồn tại", ErrorCode.ROOM_TYPE_NOT_FOUND));

        // Kiểm tra không có khoảng thời gian trùng lặp (loại trừ chính record này)
        List<SeasonalRate> overlappingRates = seasonalRateRepository.findOverlappingRatesExcluding(
                request.getRoomTypeId(), request.getStartDate(), request.getEndDate(), id);
        
        if (!overlappingRates.isEmpty()) {
            throw new BusinessException("Khoảng thời gian bị trùng lặp với giá đã có", ErrorCode.DATE_RANGE_OVERLAP);
        }

        existingRate.setRoomType(roomType);
        existingRate.setStartDate(request.getStartDate());
        existingRate.setEndDate(request.getEndDate());
        existingRate.setPrice(request.getPrice());

        existingRate = seasonalRateRepository.save(existingRate);

        return BaseResponse.<SeasonalRateResponse>builder()
                .mess("Cập nhật giá theo mùa thành công")
                .data(toSeasonalRateResponse(existingRate))
                .build();
    }

    @Override
    public BaseResponse<Void> deleteSeasonalRate(Long id) {
        if (!seasonalRateRepository.existsById(id)) {
            throw new BusinessException("Giá theo mùa không tồn tại", ErrorCode.SEASONAL_RATE_NOT_FOUND);
        }

        seasonalRateRepository.deleteById(id);

        return BaseResponse.<Void>builder()
                .mess("Xóa giá theo mùa thành công")
                .build();
    }

    @Override
    public BaseResponse<PriceLookupResponse> getPriceByDate(Long roomTypeId, LocalDate date) {
        RoomType roomType = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new BusinessException("Loại phòng không tồn tại", ErrorCode.ROOM_TYPE_NOT_FOUND));

        // Tìm giá theo mùa cho ngày cụ thể
        SeasonalRate seasonalRate = seasonalRateRepository.findByRoomTypeIdAndDate(roomTypeId, date)
                .orElse(null);

        PriceLookupResponse response;
        if (seasonalRate != null) {
            // Có giá theo mùa
            response = PriceLookupResponse.builder()
                    .roomTypeId(roomTypeId)
                    .roomTypeName(roomType.getName())
                    .date(date)
                    .price(seasonalRate.getPrice())
                    .basePrice(roomType.getBasePrice())
                    .isSeasonalRate(true)
                    .priceSource("SEASONAL_RATE")
                    .build();
        } else {
            // Dùng giá cơ bản
            response = PriceLookupResponse.builder()
                    .roomTypeId(roomTypeId)
                    .roomTypeName(roomType.getName())
                    .date(date)
                    .price(roomType.getBasePrice())
                    .basePrice(roomType.getBasePrice())
                    .isSeasonalRate(false)
                    .priceSource("BASE_PRICE")
                    .build();
        }

        return BaseResponse.<PriceLookupResponse>builder()
                .mess("Thành công")
                .data(response)
                .build();
    }

    private void validateSeasonalRateRequest(SeasonalRateRequest request) {
        if (request.getEndDate().isBefore(request.getStartDate()) || 
            request.getEndDate().isEqual(request.getStartDate())) {
            throw new BusinessException("Ngày kết thúc phải sau ngày bắt đầu", ErrorCode.INVALID_DATE_RANGE);
        }
    }

    private SeasonalRateResponse toSeasonalRateResponse(SeasonalRate seasonalRate) {
        return SeasonalRateResponse.builder()
                .id(seasonalRate.getId())
                .roomTypeId(seasonalRate.getRoomType().getId())
                .roomTypeName(seasonalRate.getRoomType().getName())
                .startDate(seasonalRate.getStartDate())
                .endDate(seasonalRate.getEndDate())
                .price(seasonalRate.getPrice())
                .build();
    }
}