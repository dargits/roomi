package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.dto.request.RoomTypeRequest;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.RoomType;
import roomi.dev.repository.RoomTypeRepository;
import roomi.dev.service.RoomTypeService;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomTypeServiceImpl implements RoomTypeService {

    private final RoomTypeRepository roomTypeRepository;

    @Override
    public RoomType createRoomType(RoomTypeRequest request) {
        if (roomTypeRepository.existsByName(request.getName())) {
            throw new BusinessException("Loại phòng đã tồn tại", ErrorCode.INVALID_INPUT);
        }

        RoomType roomType = RoomType.builder()
                .name(request.getName())
                .capacity(request.getCapacity())
                .amenities(request.getAmenities())
                .basePrice(request.getBasePrice())
                .build();

        return roomTypeRepository.save(roomType);
    }

    @Override
    public RoomType updateRoomType(Long id, RoomTypeRequest request) {
        RoomType roomType = roomTypeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại phòng", ErrorCode.INVALID_INPUT));

        if (!roomType.getName().equalsIgnoreCase(request.getName()) && roomTypeRepository.existsByName(request.getName())) {
            throw new BusinessException("Loại phòng đã tồn tại", ErrorCode.INVALID_INPUT);
        }

        roomType.setName(request.getName());
        roomType.setCapacity(request.getCapacity());
        roomType.setAmenities(request.getAmenities());
        roomType.setBasePrice(request.getBasePrice());

        return roomTypeRepository.save(roomType);
    }

    @Override
    public List<RoomType> getAllRoomTypes() {
        return roomTypeRepository.findAll();
    }

    @Override
    public RoomType getRoomTypeById(Long id) {
        return roomTypeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại phòng", ErrorCode.INVALID_INPUT));
    }

    @Override
    public void deleteRoomType(Long id) {
        RoomType roomType = roomTypeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại phòng", ErrorCode.INVALID_INPUT));
        roomTypeRepository.delete(roomType);
    }
}
