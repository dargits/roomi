package roomi.dev.util.time;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Booking;
import roomi.dev.model.Room;
import roomi.dev.model.RoomType;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.RoomRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Component chịu trách nhiệm kiểm tra xung đột lịch đặt phòng.
 * Tách biệt logic kiểm tra xung đột ra khỏi BookingServiceImpl để dễ test và tái sử dụng.
 */
@Component
@RequiredArgsConstructor
public class BookingConflictChecker {
    
    private final BookingRepository bookingRepository;
    private final RoomRepository    roomRepository;
    
    /**
     * Kiểm tra phòng có hợp lệ để gán cho booking không. Bao gồm:
     *  1. Phòng phải tồn tại trong DB
     *  2. RoomType của phòng phải khớp với roomType yêu cầu
     *  3. Phòng không bị trùng lịch với booking khác trong khoảng thời gian đó
     *
     * @param roomId            ID phòng cần gán
     * @param expectedRoomType  RoomType yêu cầu (lấy từ booking)
     * @param slot              Khoảng thời gian cần kiểm tra
     * @param excludeBookingId  Booking ID cần loại trừ khi kiểm tra (chính booking đang xử lý);
     *                          truyền -1L khi tạo mới
     * @return Room entity đã được validate
     * @throws BusinessException nếu vi phạm bất kỳ điều kiện nào
     */
    public Room validateAndGetRoom(Long roomId, RoomType expectedRoomType,
                                   TimeSlot slot, Long excludeBookingId) {
        
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(
                        "Không tìm thấy phòng với id = " + roomId,
                        ErrorCode.INVALID_INPUT));

        validateRoomType(room, expectedRoomType);
        validateOperationalStatus(room, slot);
        validateNoConflict(room, slot, excludeBookingId);
        
        return room;
    }
    
    /**
     * Chỉ kiểm tra xung đột lịch, không kiểm tra room type.
     * Dùng khi đã có Room entity và chỉ cần kiểm tra lịch.
     *
     * @throws BusinessException nếu phòng đã bị đặt trong khoảng thời gian đó
     */
    public void validateNoConflict(Room room, TimeSlot slot, Long excludeBookingId) {
        boolean conflict = bookingRepository.existsRoomConflict(
                room.getId(),
                slot.getStartDate(),
                slot.getEndDate(),
                excludeBookingId);
        
        if (conflict) {
            throw new BusinessException(
                    "Phòng " + room.getRoomNumber()
                    + " đã được đặt trong khoảng thời gian " + slot
                    + ". Vui lòng chọn phòng khác hoặc đổi ngày.",
                    ErrorCode.BOOKING_CONFLICT);
        }
    }
    
    /**
     * Lấy danh sách booking đang chiếm phòng trong khoảng thời gian,
     * dùng để hiển thị trên lịch (calendar view).
     *
     * @param roomId    ID phòng cần xem lịch
     * @param slot      Khoảng thời gian muốn xem
     * @return Danh sách booking đang active trong khoảng đó
     */
    public List<Booking> getConflictingBookings(Long roomId, TimeSlot slot) {
        return bookingRepository.findActiveBookingsByRoomAndDateRange(
                roomId,
                slot.getStartDate(),
                slot.getEndDate());
    }
    
    /**
     * Kiểm tra một phòng có bị trùng lịch không mà không ném exception.
     * Dùng cho việc filter danh sách phòng available.
     *
     * @return true nếu phòng KHÔNG bị trùng (available), false nếu đã bị đặt
     */
    public boolean isRoomAvailable(Long roomId, TimeSlot slot) {
        return !bookingRepository.existsRoomConflict(
                roomId,
                slot.getStartDate(),
                slot.getEndDate(),
                -1L);   // -1L = không loại trừ booking nào
    }
    
    /**
     * Lọc danh sách phòng — chỉ giữ lại các phòng KHÔNG bị trùng lịch trong khoảng thời gian.
     *
     * @param rooms Danh sách phòng cần lọc
     * @param slot  Khoảng thời gian cần kiểm tra
     * @return Danh sách phòng còn available
     */
    public List<Room> filterAvailableRooms(List<Room> rooms, TimeSlot slot) {
        return rooms.stream()
                .filter(room -> isOperationallyAvailable(room, slot))
                .filter(room -> isRoomAvailable(room.getId(), slot))
                .collect(Collectors.toList());
    }
    
    // ------------------------------------------------------------------ private helpers
    
    private void validateRoomType(Room room, RoomType expectedRoomType) {
        if (!room.getRoomType().getId().equals(expectedRoomType.getId())) {
            throw new BusinessException(
                    "Phòng " + room.getRoomNumber()
                    + " thuộc loại \"" + room.getRoomType().getName()
                    + "\", không khớp với loại phòng yêu cầu \""
                    + expectedRoomType.getName() + "\"",
                    ErrorCode.ROOM_TYPE_MISMATCH);
        }
    }

    private void validateOperationalStatus(Room room, TimeSlot slot) {
        if (room.getStatus() == Room.Status.MAINTENANCE) {
            throw new BusinessException(
                    "Phòng " + room.getRoomNumber() + " đang bảo trì",
                    ErrorCode.ROOM_NOT_AVAILABLE);
        }

        if (room.getStatus() == Room.Status.NEEDS_CLEANING
                && slot.getStartDate().isEqual(LocalDate.now())) {
            throw new BusinessException(
                    "Phòng " + room.getRoomNumber() + " đang chờ dọn dẹp",
                    ErrorCode.ROOM_NOT_AVAILABLE);
        }

        if (room.getStatus() == Room.Status.OCCUPIED
                && slot.getStartDate().isEqual(LocalDate.now())) {
            throw new BusinessException(
                    "Phòng " + room.getRoomNumber() + " đang được sử dụng",
                    ErrorCode.ROOM_NOT_AVAILABLE);
        }
    }

    private boolean isOperationallyAvailable(Room room, TimeSlot slot) {
        if (room.getStatus() == Room.Status.MAINTENANCE) {
            return false;
        }

        if (!slot.getStartDate().isEqual(LocalDate.now())) {
            return true;
        }

        return room.getStatus() != Room.Status.NEEDS_CLEANING
                && room.getStatus() != Room.Status.OCCUPIED;
    }
}
