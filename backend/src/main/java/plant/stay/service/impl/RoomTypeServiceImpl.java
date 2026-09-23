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

    @Autowired
    @org.springframework.context.annotation.Lazy
    private plant.stay.repository.RoomRepository roomRepository;

    @Autowired
    @org.springframework.context.annotation.Lazy
    private plant.stay.repository.BookingRepository bookingRepository;

    @Autowired
    @org.springframework.context.annotation.Lazy
    private plant.stay.service.PricingService pricingService;

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
        validateCapacity(request);
        RoomType roomType = RoomType.builder()
                .name(request.getName())
                .standardCapacity(request.getStandardCapacity() != null ? request.getStandardCapacity() : 2)
                .maxCapacity(request.getMaxCapacity())
                .extraPersonChargePerNight(request.getExtraPersonChargePerNight() != null ? request.getExtraPersonChargePerNight() : java.math.BigDecimal.ZERO)
                .maxChildAgeFree(request.getMaxChildAgeFree() != null ? request.getMaxChildAgeFree() : 6)
                .basePrice(request.getBasePrice())
                .amenitiesDescription(request.getAmenitiesDescription())
                .imageUrls(request.getImageUrls() != null ? request.getImageUrls() : new java.util.ArrayList<>())
                .standardCheckoutCleaningMinutes(request.getStandardCheckoutCleaningMinutes() != null ? request.getStandardCheckoutCleaningMinutes() : 45)
                .standardPeriodicCleaningMinutes(request.getStandardPeriodicCleaningMinutes() != null ? request.getStandardPeriodicCleaningMinutes() : 20)
                .active(request.getActive() != null ? request.getActive() : true)
                .build();
        
        RoomType saved = roomTypeRepository.save(roomType);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request) {
        validateCapacity(request);
        RoomType roomType = roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng với ID: " + id));
                
        roomType.setName(request.getName());
        if (request.getStandardCapacity() != null) {
            roomType.setStandardCapacity(request.getStandardCapacity());
        }
        roomType.setMaxCapacity(request.getMaxCapacity());
        if (request.getExtraPersonChargePerNight() != null) {
            roomType.setExtraPersonChargePerNight(request.getExtraPersonChargePerNight());
        }
        if (request.getMaxChildAgeFree() != null) {
            roomType.setMaxChildAgeFree(request.getMaxChildAgeFree());
        }
        roomType.setBasePrice(request.getBasePrice());
        roomType.setAmenitiesDescription(request.getAmenitiesDescription());
        if (request.getStandardCheckoutCleaningMinutes() != null) {
            roomType.setStandardCheckoutCleaningMinutes(request.getStandardCheckoutCleaningMinutes());
        }
        if (request.getStandardPeriodicCleaningMinutes() != null) {
            roomType.setStandardPeriodicCleaningMinutes(request.getStandardPeriodicCleaningMinutes());
        }
        if (request.getImageUrls() != null) {
            roomType.setImageUrls(request.getImageUrls());
        }
        if (request.getActive() != null) {
            roomType.setActive(request.getActive());
        }
        
        RoomType updated = roomTypeRepository.save(roomType);
        return mapToResponse(updated);
    }

    private void validateCapacity(RoomTypeRequest request) {
        if (request.getStandardCapacity() != null && request.getMaxCapacity() != null) {
            if (request.getMaxCapacity() < request.getStandardCapacity()) {
                throw new IllegalArgumentException("Sức chứa tối đa (" + request.getMaxCapacity() + ") không được nhỏ hơn sức chứa tiêu chuẩn (" + request.getStandardCapacity() + ")");
            }
        }
        if (request.getExtraPersonChargePerNight() != null && request.getExtraPersonChargePerNight().compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Mức phụ thu thêm người không được là số âm");
        }
        if (request.getMaxChildAgeFree() != null && request.getMaxChildAgeFree() < 0) {
            throw new IllegalArgumentException("Độ tuổi trẻ em miễn phí không được là số âm");
        }
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
        java.math.BigDecimal currentPrice = roomType.getBasePrice();
        String priceSource = "BASE";
        String priceSourceName = null;

        if (pricingService != null) {
            try {
                var nightDetail = pricingService.calculateNightPrice(roomType, java.time.LocalDate.now());
                if (nightDetail != null && nightDetail.getAppliedPrice() != null) {
                    currentPrice = nightDetail.getAppliedPrice();
                    priceSource = nightDetail.getPriceSource();
                    priceSourceName = nightDetail.getSourceName();
                }
            } catch (Exception ignored) {
            }
        }

        Long totalRooms = null;
        Long availableToday = null;
        Boolean isAvailableToday = null;

        if (roomRepository != null && bookingRepository != null) {
            try {
                List<plant.stay.model.Room> allRooms = roomRepository.findByRoomTypeId(roomType.getId());
                long totalPhysical = allRooms.size();
                java.time.LocalDate today = java.time.LocalDate.now();
                java.time.LocalDate tomorrow = today.plusDays(1);
                List<plant.stay.model.Booking> activeToday = bookingRepository.findActiveOverlappingByRoomTypeAndRange(
                        roomType.getId(), today, tomorrow);

                java.util.Set<Long> occupiedRoomIds = new java.util.HashSet<>();
                int unassignedBookingCount = 0;
                for (var b : activeToday) {
                    if (b.getRoom() != null) {
                        occupiedRoomIds.add(b.getRoom().getId());
                    } else {
                        unassignedBookingCount++;
                    }
                }
                for (var r : allRooms) {
                    if (r.getStatus() == plant.stay.model.RoomStatus.MAINTENANCE || r.getStatus() == plant.stay.model.RoomStatus.OCCUPIED) {
                        occupiedRoomIds.add(r.getId());
                    }
                }
                long totalOccupied = occupiedRoomIds.size() + unassignedBookingCount;
                long avail = Math.max(0, totalPhysical - totalOccupied);

                totalRooms = totalPhysical;
                availableToday = avail;
                isAvailableToday = totalPhysical > 0 && avail > 0;
            } catch (Exception ignored) {
            }
        }

        return RoomTypeResponse.builder()
                .id(roomType.getId())
                .name(roomType.getName())
                .standardCapacity(roomType.getStandardCapacity())
                .maxCapacity(roomType.getMaxCapacity())
                .extraPersonChargePerNight(roomType.getExtraPersonChargePerNight())
                .maxChildAgeFree(roomType.getMaxChildAgeFree())
                .basePrice(roomType.getBasePrice())
                .currentPrice(currentPrice)
                .priceSource(priceSource)
                .priceSourceName(priceSourceName)
                .amenitiesDescription(roomType.getAmenitiesDescription())
                .imageUrls(roomType.getImageUrls())
                .standardCheckoutCleaningMinutes(roomType.getStandardCheckoutCleaningMinutes() != null ? roomType.getStandardCheckoutCleaningMinutes() : 45)
                .standardPeriodicCleaningMinutes(roomType.getStandardPeriodicCleaningMinutes() != null ? roomType.getStandardPeriodicCleaningMinutes() : 20)
                .active(roomType.isActive())
                .totalRooms(totalRooms)
                .availableRoomsToday(availableToday)
                .isAvailableToday(isAvailableToday)
                .createdAt(roomType.getCreatedAt())
                .updatedAt(roomType.getUpdatedAt())
                .build();
    }
}
