package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.dto.request.RoomRequest;
import roomi.dev.dto.response.OccupancyReportResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Booking;
import roomi.dev.model.Room;
import roomi.dev.model.RoomType;
import roomi.dev.model.CleaningNotification;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.CleaningNotificationRepository;
import roomi.dev.repository.RoomRepository;
import roomi.dev.repository.RoomTypeRepository;
import roomi.dev.service.RoomService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final BookingRepository bookingRepository;
    private final CleaningNotificationRepository cleaningNotificationRepository;

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
    @Transactional
    public List<Room> getAllRooms() {
        syncRoomStatuses();
        return roomRepository.findAllByOrderByFloorAscRoomNumberAsc();
    }

    /**
     * Đồng bộ trạng thái tất cả phòng theo booking CHECKED_IN đang hoạt động.
     * Trả về số phòng đã được cập nhật.
     */
    @Override
    @Transactional
    public int syncRoomStatuses() {
        List<Room> allRooms = roomRepository.findAll();
        LocalDate today = LocalDate.now();
        int updated = 0;

        for (Room room : allRooms) {
            if (room.getStatus() == Room.Status.MAINTENANCE) {
                continue;
            }

            // Tìm các booking đang ở (CHECKED_IN) gán cho phòng này
            List<Booking> checkedInBookings = bookingRepository.findByRoomId(room.getId()).stream()
                    .filter(b -> b.getStatus() == Booking.Status.CHECKED_IN)
                    .toList();

            boolean isOccupied = !checkedInBookings.isEmpty();

            if (isOccupied) {
                // Đảm bảo ngày nhận phòng không bị ghi ở tương lai nếu đơn đã CHECKED_IN
                for (Booking b : checkedInBookings) {
                    if (b.getCheckInDate() != null && b.getCheckInDate().isAfter(today)) {
                        b.setCheckInDate(today);
                        bookingRepository.save(b);
                    }
                }
                if (room.getStatus() != Room.Status.OCCUPIED) {
                    room.setStatus(Room.Status.OCCUPIED);
                    roomRepository.save(room);
                    updated++;
                }
            } else if (room.getStatus() == Room.Status.OCCUPIED) {
                room.setStatus(Room.Status.NEEDS_CLEANING);
                roomRepository.save(room);
                updated++;
            }
        }

        return updated;
    }

    /**
     * Cập nhật trạng thái buồng phòng (NCL-06 — §2.5).
     * Nhân viên buồng phòng gọi endpoint này sau khi dọn xong để chuyển phòng về AVAILABLE.
     * Lưu ý: không cho phép tự ý đặt phòng sang OCCUPIED qua endpoint này (chỉ check-in mới làm được).
     */
    @Override
    @Transactional
    public Room updateRoomStatus(Long id, String status) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phòng", ErrorCode.INVALID_INPUT));

        Room.Status newStatus;
        try {
            newStatus = Room.Status.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(
                    "Trạng thái phòng không hợp lệ: " + status
                    + ". Các giá trị hợp lệ: AVAILABLE, NEEDS_CLEANING, MAINTENANCE, OCCUPIED",
                    ErrorCode.INVALID_INPUT);
        }

        // 1. Không cho phép tự ý chuyển phòng sang OCCUPIED (chỉ thông qua check-in)
        if (newStatus == Room.Status.OCCUPIED) {
            throw new BusinessException(
                    "Không thể cập nhật trạng thái phòng thành OCCUPIED thủ công. Vui lòng thực hiện Check-in cho booking để chuyển trạng thái phòng.",
                    ErrorCode.INVALID_INPUT);
        }

        // 2. Không cho phép thay đổi trạng thái của phòng đang có khách (OCCUPIED)
        if (room.getStatus() == Room.Status.OCCUPIED) {
            throw new BusinessException(
                    "Phòng đang có khách (OCCUPIED), không thể thay đổi trạng thái trực tiếp.",
                    ErrorCode.INVALID_INPUT);
        }

        Room.Status oldStatus = room.getStatus();
        room.setStatus(newStatus);
        Room savedRoom = roomRepository.save(room);

        // Xử lý thông báo dọn phòng
        if (newStatus != Room.Status.NEEDS_CLEANING) {
            cleaningNotificationRepository.deleteByRoomId(id);
        } else if (oldStatus != Room.Status.NEEDS_CLEANING) {
            cleaningNotificationRepository.deleteByRoomId(id);
            CleaningNotification notification = CleaningNotification.builder()
                    .roomId(savedRoom.getId())
                    .roomNumber(savedRoom.getRoomNumber())
                    .message("Phòng " + savedRoom.getRoomNumber() + " đang cần dọn dẹp!")
                    .isRead(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            cleaningNotificationRepository.save(notification);
        }

        return savedRoom;
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