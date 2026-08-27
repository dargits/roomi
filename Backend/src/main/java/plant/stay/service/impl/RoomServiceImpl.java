package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.RoomRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.RoomResponse;
import plant.stay.exception.DuplicateResourceException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.UserRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.RoomService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final AuditLogService auditLogService;

    @Override
    public List<RoomResponse> getAll() {
        return roomRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<RoomResponse> getByStatus(RoomStatus status) {
        return roomRepository.findByStatus(status).stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public RoomResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Override
    @Transactional
    public RoomResponse create(RoomRequest request, User actor) {
        if (roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new DuplicateResourceException("Số phòng '" + request.getRoomNumber() + "' đã tồn tại");
        }
        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));

        Room room = Room.builder()
                .roomNumber(request.getRoomNumber())
                .roomType(roomType)
                .floor(request.getFloor())
                .status(request.getStatus() != null ? request.getStatus() : RoomStatus.AVAILABLE)
                .notes(request.getNotes())
                .build();
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "CREATE", actor, "Tạo phòng " + room.getRoomNumber());
        return toResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse update(Long id, RoomRequest request, User actor) {
        Room room = findById(id);
        if (!room.getRoomNumber().equals(request.getRoomNumber()) &&
            roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new DuplicateResourceException("Số phòng '" + request.getRoomNumber() + "' đã tồn tại");
        }
        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));

        room.setRoomNumber(request.getRoomNumber());
        room.setRoomType(roomType);
        room.setFloor(request.getFloor());
        if (request.getStatus() != null) room.setStatus(request.getStatus());
        room.setNotes(request.getNotes());
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "UPDATE", actor, "Cập nhật phòng " + room.getRoomNumber());
        return toResponse(room);
    }

    @Override
    @Transactional
    public MessageResponse delete(Long id) {
        Room room = findById(id);
        roomRepository.delete(room);
        return new MessageResponse("Đã xóa phòng " + room.getRoomNumber());
    }

    @Override
    @Transactional
    public RoomResponse markClean(Long id, User actor) {
        Room room = findById(id);
        if (room.getStatus() != RoomStatus.DIRTY && room.getStatus() != RoomStatus.INSPECTING) {
            throw new IllegalArgumentException("Chỉ có thể đánh dấu sạch khi phòng đang ở trạng thái DIRTY hoặc INSPECTING");
        }
        room.setStatus(RoomStatus.AVAILABLE);
        room.setAssignedHousekeeper(null);
        room.setAssignedAt(null);
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "MARK_CLEAN", actor, "Phòng " + room.getRoomNumber() + " đã dọn xong");
        return toResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse markDirty(Long id, User actor) {
        Room room = findById(id);
        room.setStatus(RoomStatus.DIRTY);
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "MARK_DIRTY", actor, "Đánh dấu phòng " + room.getRoomNumber() + " cần dọn dẹp");
        return toResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse setMaintenance(Long id, User actor) {
        Room room = findById(id);
        room.setStatus(RoomStatus.MAINTENANCE);
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "MAINTENANCE", actor, "Khóa phòng " + room.getRoomNumber() + " để bảo trì");
        return toResponse(room);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomResponse> getAvailableWithoutConflicts(Long roomTypeId, java.time.LocalDate checkInDate, java.time.LocalDate checkOutDate) {
        return roomRepository.findAvailableWithoutConflicts(roomTypeId, RoomStatus.AVAILABLE, checkInDate, checkOutDate)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ===== NCL-06-CN-NEW: Housekeeping 2 bước =====

    @Override
    @Transactional
    public RoomResponse submitForInspection(Long id, User actor) {
        Room room = findById(id);
        if (room.getStatus() != RoomStatus.DIRTY) {
            throw new IllegalArgumentException("Chỉ có thể gửi kiểm tra khi phòng ở trạng thái DIRTY");
        }
        room.setStatus(RoomStatus.INSPECTING);
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "SUBMIT_INSPECTION", actor,
                "Phòng " + room.getRoomNumber() + " đã dọn xong, chờ kiểm tra");
        return toResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse approveClean(Long id, User actor) {
        Room room = findById(id);
        if (room.getStatus() != RoomStatus.INSPECTING) {
            throw new IllegalArgumentException("Chỉ có thể duyệt sạch khi phòng đang ở trạng thái INSPECTING");
        }
        room.setStatus(RoomStatus.AVAILABLE);
        room.setAssignedHousekeeper(null);
        room.setAssignedAt(null);
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "APPROVE_CLEAN", actor,
                "Phòng " + room.getRoomNumber() + " đã được duyệt sạch, sẵn sàng phục vụ");
        return toResponse(room);
    }

    // ===== NCL-06-CN-004: Phân công nhân viên buồng phòng =====

    @Override
    @Transactional
    public RoomResponse assignCleaner(Long id, Long housekeeperId, User actor) {
        Room room = findById(id);

        // Không phân công phòng đang khóa bảo trì hoặc đang có khách lưu trú
        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            throw new IllegalArgumentException("Phòng " + room.getRoomNumber() + " đang khóa bảo trì, không thể phân công dọn phòng");
        }
        if (room.getStatus() == RoomStatus.OCCUPIED) {
            throw new IllegalArgumentException("Phòng " + room.getRoomNumber() + " đang có khách lưu trú, không thể phân công dọn phòng");
        }
        if (room.getStatus() != RoomStatus.DIRTY && room.getStatus() != RoomStatus.INSPECTING) {
            throw new IllegalArgumentException("Chỉ có thể phân công cho phòng ở trạng thái Cần dọn (DIRTY) hoặc Chờ duyệt (INSPECTING)");
        }

        User housekeeper = userRepository.findById(housekeeperId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên"));

        if (!housekeeper.isActive()) {
            throw new IllegalArgumentException("Tài khoản nhân viên " + housekeeper.getName() + " hiện đang bị khóa hoặc ngừng hoạt động");
        }

        if (housekeeper.getRole() != Role.HOUSEKEEPER) {
            throw new IllegalArgumentException("Chỉ có thể phân công dọn phòng cho tài khoản có vai trò Nhân viên buồng phòng (HOUSEKEEPER)");
        }

        // Ghi log nếu phòng đang có người phụ trách khác (chuyển giao)
        String oldCleanerName = room.getAssignedHousekeeper() != null ? room.getAssignedHousekeeper().getName() : null;
        if (oldCleanerName != null && !room.getAssignedHousekeeper().getId().equals(housekeeperId)) {
            auditLogService.log("Room", room.getId(), "REASSIGN_CLEANER", actor,
                    "Chuyển giao phân công dọn phòng " + room.getRoomNumber()
                    + " từ " + oldCleanerName + " sang " + housekeeper.getName());
        }

        room.setAssignedHousekeeper(housekeeper);
        room.setAssignedAt(LocalDateTime.now());
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "ASSIGN_CLEANER", actor,
                "Phân công nhân viên " + housekeeper.getName() + " dọn phòng " + room.getRoomNumber());
        return toResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse unassignCleaner(Long id, User actor) {
        Room room = findById(id);
        String oldCleanerName = room.getAssignedHousekeeper() != null ? room.getAssignedHousekeeper().getName() : "Chưa phân công";
        room.setAssignedHousekeeper(null);
        room.setAssignedAt(null);
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "UNASSIGN_CLEANER", actor,
                "Hủy phân công dọn phòng " + room.getRoomNumber() + " (Người phụ trách trước đó: " + oldCleanerName + ")");
        return toResponse(room);
    }

    private Room findById(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng với id: " + id));
    }

    private RoomResponse toResponse(Room room) {
        LocalDate today = LocalDate.now();
        LocalDate nextCheckIn = null;
        java.time.LocalTime nextCheckInTime = java.time.LocalTime.of(14, 0);
        String nextGuest = null;
        String priority = "NORMAL";

        // Tra cứu khách nhận phòng sắp tới để tính mức ưu tiên dọn dẹp
        try {
            List<Booking> upcoming = bookingRepository.findUpcomingConfirmedBookingsForRoom(room.getId(), today);
            if (upcoming != null && !upcoming.isEmpty()) {
                Booking nextBooking = upcoming.get(0);
                nextCheckIn = nextBooking.getCheckInDate();
                if (nextBooking.getGuest() != null) {
                    nextGuest = nextBooking.getGuest().getName();
                }
                if (today.equals(nextCheckIn)) {
                    priority = "URGENT"; // Khách nhận phòng hôm nay
                } else if (today.plusDays(1).equals(nextCheckIn)) {
                    priority = "HIGH"; // Khách nhận phòng ngày mai
                }
            }
        } catch (Exception ignored) {
            // Không để lỗi truy vấn booking ảnh hưởng đến việc load phòng
        }

        return RoomResponse.builder()
                .id(room.getId())
                .roomNumber(room.getRoomNumber())
                .roomTypeId(room.getRoomType().getId())
                .roomTypeName(room.getRoomType().getName())
                .maxCapacity(room.getRoomType().getMaxCapacity())
                .floor(room.getFloor())
                .status(room.getStatus())
                .notes(room.getNotes())
                .assignedHousekeeperId(room.getAssignedHousekeeper() != null ? room.getAssignedHousekeeper().getId() : null)
                .assignedHousekeeperName(room.getAssignedHousekeeper() != null ? room.getAssignedHousekeeper().getName() : null)
                .assignedAt(room.getAssignedAt())
                .nextCheckInDate(nextCheckIn)
                .nextCheckInTime(nextCheckInTime)
                .nextGuestName(nextGuest)
                .priorityLevel(priority)
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .build();
    }
}

