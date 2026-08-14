package plant.stay.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.RoomTypeRequest;
import plant.stay.dto.response.RoomTypeResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.RoomType;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.service.RoomTypeService;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RoomTypeServiceImpl implements RoomTypeService {

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeResponse> getAllRoomTypes() {
        return roomTypeRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeResponse> getActiveRoomTypes() {
        return roomTypeRepository.findByActiveTrue().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RoomTypeResponse getRoomTypeById(Long id) {
        RoomType roomType = roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng với ID: " + id));
        return mapToResponse(roomType);
    }

    @Override
    @Transactional
    public RoomTypeResponse createRoomType(RoomTypeRequest request) {
        RoomType roomType = RoomType.builder()
                .name(request.getName())
                .maxCapacity(request.getMaxCapacity())
                .basePrice(request.getBasePrice())
                .amenitiesDescription(request.getAmenitiesDescription())
                .imageUrls(request.getImageUrls() != null ? request.getImageUrls() : new java.util.ArrayList<>())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();
        
        RoomType saved = roomTypeRepository.save(roomType);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request) {
        RoomType roomType = roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng với ID: " + id));
                
        roomType.setName(request.getName());
        roomType.setMaxCapacity(request.getMaxCapacity());
        roomType.setBasePrice(request.getBasePrice());
        roomType.setAmenitiesDescription(request.getAmenitiesDescription());
        if (request.getImageUrls() != null) {
            roomType.setImageUrls(request.getImageUrls());
        }
        if (request.getActive() != null) {
            roomType.setActive(request.getActive());
        }
        
        RoomType updated = roomTypeRepository.save(roomType);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void deleteRoomType(Long id) {
        if (!roomTypeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy loại phòng với ID: " + id);
        }
        roomTypeRepository.deleteById(id);
    }

    private RoomTypeResponse mapToResponse(RoomType roomType) {
        return RoomTypeResponse.builder()
                .id(roomType.getId())
                .name(roomType.getName())
                .maxCapacity(roomType.getMaxCapacity())
                .basePrice(roomType.getBasePrice())
                .amenitiesDescription(roomType.getAmenitiesDescription())
                .imageUrls(roomType.getImageUrls())
                .active(roomType.isActive())
                .createdAt(roomType.getCreatedAt())
                .updatedAt(roomType.getUpdatedAt())
                .build();
    }
}
