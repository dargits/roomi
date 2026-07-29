package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.dto.request.RoomRequest;
import roomi.dev.dto.response.OccupancyReportResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Booking;
import roomi.dev.model.Room;
import roomi.dev.model.RoomType;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.RoomRepository;
import roomi.dev.repository.RoomTypeRepository;
import roomi.dev.service.RoomService;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final BookingRepository bookingRepository;

    @Override
    public Room createRoom(RoomRequest request) {
        if (roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new BusinessException("Phòng này đã tồn tại", ErrorCode.INVALID_INPUT);
        }

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new BusinessException("Loại phòng không tồn tại", ErrorCode.INVALID_INPUT));

        Room room = Room.builder()
                .roomType(roomType)
                .roomNumber(request.getRoomNumber())
                .floor(request.getFloor())
                .note(request.getNote())
                .build();

        if (request.getStatus() != null) {
            room.setStatus(Room.Status.valueOf(request.getStatus().toUpperCase()));
        }

        return roomRepository.save(room);
    }

    @Override
    public Room updateRoom(Long id, RoomRequest request) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phòng", ErrorCode.INVALID_INPUT));

        if (!room.getRoomNumber().equals(request.getRoomNumber()) && roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new BusinessException("Phòng này đã tồn tại", ErrorCode.INVALID_INPUT);
        }

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new BusinessException("Loại phòng không tồn tại", ErrorCode.INVALID_INPUT));

        room.setRoomType(roomType);
        room.setRoomNumber(request.getRoomNumber());
        room.setFloor(request.getFloor());
        room.setNote(request.getNote());
        if (request.getStatus() != null) {
            room.setStatus(Room.Status.valueOf(request.getStatus().toUpperCase()));
        }

        return roomRepository.save(room);
    }

    @Override
    public void deleteRoom(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phòng", ErrorCode.INVALID_INPUT));

        List<Booking> bookings = bookingRepository.findByRoomId(id);
        if (!bookings.isEmpty()) {
            throw new BusinessException("Không thể xóa phòng đã có lịch sử đặt phòng hoặc đang hoạt động. Hãy chuyển phòng hoặc hủy các đặt phòng liên quan trước.", ErrorCode.INVALID_INPUT);
        }

        roomRepository.delete(room);
    }

    @Override
    public List<Room> getAllRooms() {
        List<Room> rooms = roomRepository.findAllByOrderByFloorAscRoomNumberAsc();
        LocalDate today = LocalDate.now();

        for (Room room : rooms) {
            if (room.getStatus() == Room.Status.MAINTENANCE || room.getStatus() == Room.Status.NEEDS_CLEANING) {
                continue;
            }

            boolean isOccupiedToday = bookingRepository.isRoomOccupiedOnDate(room.getId(), today);

            if (isOccupiedToday) {
                room.setStatus(Room.Status.OCCUPIED);
            } else if (room.getStatus() == Room.Status.OCCUPIED) {
                room.setStatus(Room.Status.AVAILABLE);
            }
        }

        return rooms;
    }

    @Override
    public Room getRoomById(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phòng", ErrorCode.INVALID_INPUT));
    }

    public OccupancyReportResponse getCurrentOccupancyReport() {
        long totalRooms = roomRepository.count();
        long occupiedRooms = roomRepository.countByStatus(Room.Status.OCCUPIED);

        double occupancyRate = totalRooms > 0 
                ? ((double) occupiedRooms / totalRooms) * 100.0 
                : 0.0;

        occupancyRate = Math.round(occupancyRate * 100.0) / 100.0;

        return OccupancyReportResponse.builder()
                .totalRooms(totalRooms)
                .occupiedRooms(occupiedRooms)
                .occupancyRate(occupancyRate)
                .build();
    }
}