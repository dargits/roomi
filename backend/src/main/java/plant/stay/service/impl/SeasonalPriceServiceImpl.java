package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.SeasonalPriceRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.SeasonalPriceResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.RoomType;
import plant.stay.model.SeasonalPrice;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.SeasonalPriceRepository;
import plant.stay.service.SeasonalPriceService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeasonalPriceServiceImpl implements SeasonalPriceService {

    private final SeasonalPriceRepository seasonalPriceRepository;
    private final RoomTypeRepository roomTypeRepository;

    @Override
    public List<SeasonalPriceResponse> getByRoomType(Long roomTypeId) {
        findRoomType(roomTypeId);
        return seasonalPriceRepository.findByRoomTypeId(roomTypeId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public SeasonalPriceResponse create(Long roomTypeId, SeasonalPriceRequest request) {
        RoomType roomType = findRoomType(roomTypeId);
        validateRequest(request);
        checkOverlap(roomTypeId, request, -1L);

        SeasonalPrice price = SeasonalPrice.builder()
                .roomType(roomType)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .pricePerNight(request.getPricePerNight())
                .build();
        return toResponse(seasonalPriceRepository.save(price));
    }

    @Override
    @Transactional
    public SeasonalPriceResponse update(Long roomTypeId, Long priceId, SeasonalPriceRequest request) {
        findRoomType(roomTypeId);
        SeasonalPrice price = seasonalPriceRepository.findById(priceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giá theo mùa"));
        validateRequest(request);
        checkOverlap(roomTypeId, request, priceId);

        price.setStartDate(request.getStartDate());
        price.setEndDate(request.getEndDate());
        price.setPricePerNight(request.getPricePerNight());
        return toResponse(seasonalPriceRepository.save(price));
    }

    @Override
    @Transactional
    public MessageResponse delete(Long roomTypeId, Long priceId) {
        findRoomType(roomTypeId);
        SeasonalPrice price = seasonalPriceRepository.findById(priceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giá theo mùa"));
        seasonalPriceRepository.delete(price);
        return new MessageResponse("Đã xóa giá theo mùa");
    }

    private void validateRequest(SeasonalPriceRequest request) {
        if (!request.getEndDate().isAfter(request.getStartDate())) {
            throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu");
        }
    }

    private void checkOverlap(Long roomTypeId, SeasonalPriceRequest request, Long excludeId) {
        List<SeasonalPrice> overlapping = seasonalPriceRepository.findOverlapping(
                roomTypeId, request.getStartDate(), request.getEndDate(), excludeId);
        if (!overlapping.isEmpty()) {
            throw new IllegalArgumentException("Khoảng thời gian này bị trùng với giá theo mùa đã tồn tại");
        }
    }

    private RoomType findRoomType(Long id) {
        return roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
    }

    private SeasonalPriceResponse toResponse(SeasonalPrice sp) {
        return SeasonalPriceResponse.builder()
                .id(sp.getId())
                .roomTypeId(sp.getRoomType().getId())
                .roomTypeName(sp.getRoomType().getName())
                .startDate(sp.getStartDate())
                .endDate(sp.getEndDate())
                .pricePerNight(sp.getPricePerNight())
                .createdAt(sp.getCreatedAt())
                .build();
    }
}
