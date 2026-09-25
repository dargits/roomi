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
import plant.stay.service.NotificationService;
import plant.stay.service.RoomService;
import org.springframework.context.ApplicationEventPublisher;
import plant.stay.event.CalendarSyncEvent;

import plant.stay.repository.HotelSettingRepository;
import plant.stay.repository.RoomCleaningRecordRepository;
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
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;
    private final HotelSettingRepository hotelSettingRepository;
    private final RoomCleaningRecordRepository roomCleaningRecordRepository;

    @Override
    public List<RoomResponse> getAll() {
        return roomRepository.findAllWithRoomType().stream().map(this::toResponse).collect(Collectors.toList());
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
                .lastCleanedAt(LocalDateTime.now())
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
        RoomStatus oldStatus = room.getStatus();
        if (request.getStatus() != null) room.setStatus(request.getStatus());
        room.setNotes(request.getNotes());
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "UPDATE", actor, "Cập nhật phòng " + room.getRoomNumber());
        if (oldStatus == RoomStatus.MAINTENANCE || room.getStatus() == RoomStatus.MAINTENANCE) {
            eventPublisher.publishEvent(new CalendarSyncEvent(room.getRoomType().getId(), "ROOM_MAINTENANCE"));
        }
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
        room.setLastCleanedAt(LocalDateTime.now());
        room.setCleaningReason(null);
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
        room.setCleaningReason("MANUAL");
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "MARK_DIRTY", actor, "Đánh dấu phòng " + room.getRoomNumber() + " cần dọn dẹp");

        // [Notification] Thông báo phòng cần dọn cho Buồng phòng & Lễ tân
        try {
            notificationService.createForRoles(
                NotificationType.ROOM_DIRTY,
                "Phòng cần dọn: " + room.getRoomNumber(),
                "Phòng " + room.getRoomNumber() + " được đánh dấu cần dọn dẹp",
                "ROOM", room.getId());
        } catch (Exception ex) {
            // Không làm gián đoạn luồng chính
        }

        return toResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse setMaintenance(Long id, User actor) {
        Room room = findById(id);
        room.setStatus(RoomStatus.MAINTENANCE);
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "MAINTENANCE", actor, "Khóa phòng " + room.getRoomNumber() + " để bảo trì");
        eventPublisher.publishEvent(new CalendarSyncEvent(room.getRoomType().getId(), "ROOM_MAINTENANCE"));
        return toResponse(room);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomResponse> getAvailableWithoutConflicts(Long roomTypeId, java.time.LocalDate checkInDate, java.time.LocalDate checkOutDate) {
        return roomRepository.findAvailableWithoutConflicts(roomTypeId, RoomStatus.AVAILABLE, checkInDate, checkOutDate)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ===== feature/time-standard: Đo thời gian dọn và theo dõi năng suất buồng phòng =====

    @Override
    @Transactional
    public RoomResponse startCleaning(Long id, User actor) {
        Room room = findById(id);
        if (room.getStatus() != RoomStatus.DIRTY) {
            throw new IllegalArgumentException("Chỉ có thể bắt đầu dọn khi phòng ở trạng thái Cần dọn (DIRTY)");
        }

        LocalDateTime now = LocalDateTime.now();
        int standardMinutes = 45;
        if (room.getRoomType() != null) {
            if ("PERIODIC_VACANT".equals(room.getCleaningReason())) {
                standardMinutes = room.getRoomType().getStandardPeriodicCleaningMinutes() != null
                        ? room.getRoomType().getStandardPeriodicCleaningMinutes() : 20;
            } else {
                standardMinutes = room.getRoomType().getStandardCheckoutCleaningMinutes() != null
                        ? room.getRoomType().getStandardCheckoutCleaningMinutes() : 45;
            }
        }

        User housekeeper = room.getAssignedHousekeeper() != null ? room.getAssignedHousekeeper() : actor;
        RoomCleaningRecord record;

        // Nếu đã có bản ghi đang diễn ra thì tái sử dụng
        if (room.getActiveCleaningRecordId() != null) {
            record = roomCleaningRecordRepository.findById(room.getActiveCleaningRecordId()).orElse(null);
            if (record != null && record.getStatus() == CleaningRecordStatus.IN_PROGRESS) {
                record.setStartedAt(now);
                record.setHousekeeper(housekeeper);
                record.setStandardDurationMinutes(standardMinutes);
                record = roomCleaningRecordRepository.save(record);
            } else {
                record = null;
            }
        } else {
            record = null;
        }

        if (record == null) {
            record = RoomCleaningRecord.builder()
                    .room(room)
                    .roomType(room.getRoomType())
                    .housekeeper(housekeeper)
                    .cleaningType("PERIODIC_VACANT".equals(room.getCleaningReason()) ? "PERIODIC" : "CHECKOUT")
                    .standardDurationMinutes(standardMinutes)
                    .startedAt(now)
                    .status(CleaningRecordStatus.IN_PROGRESS)
                    .isInterrupted(false)
                    .hasIncident(false)
                    .rejectionCount(0)
                    .build();
            record = roomCleaningRecordRepository.save(record);
        }

        room.setCleaningStartedAt(now);
        room.setActiveCleaningRecordId(record.getId());
        if (room.getAssignedHousekeeper() == null && actor.getRole() == Role.HOUSEKEEPER) {
            room.setAssignedHousekeeper(actor);
            room.setAssignedAt(now);
        }
        room = roomRepository.save(room);

        auditLogService.log("Room", room.getId(), "START_CLEANING", actor,
                "Bắt đầu dọn phòng " + room.getRoomNumber() + " (Định mức: " + standardMinutes + " phút)");
        return toResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse interruptCleaning(Long id, String reason, User actor) {
        Room room = findById(id);
        if (room.getActiveCleaningRecordId() != null) {
            RoomCleaningRecord record = roomCleaningRecordRepository.findById(room.getActiveCleaningRecordId()).orElse(null);
            if (record != null) {
                record.setIsInterrupted(true);
                record.setInterruptionReason(reason != null ? reason : "Gián đoạn tác vụ dọn phòng");
                roomCleaningRecordRepository.save(record);
            }
        }
        auditLogService.log("Room", room.getId(), "INTERRUPT_CLEANING", actor,
                "Đánh dấu phòng " + room.getRoomNumber() + " bị gián đoạn: " + (reason != null ? reason : "Không nêu lý do"));
        return toResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse submitForInspection(Long id, User actor) {
        Room room = findById(id);
        if (room.getStatus() != RoomStatus.DIRTY) {
            throw new IllegalArgumentException("Chỉ có thể gửi kiểm tra khi phòng ở trạng thái Cần dọn (DIRTY)");
        }

        LocalDateTime now = LocalDateTime.now();
        int standardMinutes = 45;
        if (room.getRoomType() != null) {
            if ("PERIODIC_VACANT".equals(room.getCleaningReason())) {
                standardMinutes = room.getRoomType().getStandardPeriodicCleaningMinutes() != null
                        ? room.getRoomType().getStandardPeriodicCleaningMinutes() : 20;
            } else {
                standardMinutes = room.getRoomType().getStandardCheckoutCleaningMinutes() != null
                        ? room.getRoomType().getStandardCheckoutCleaningMinutes() : 45;
            }
        }

        if (room.getActiveCleaningRecordId() != null) {
            RoomCleaningRecord record = roomCleaningRecordRepository.findById(room.getActiveCleaningRecordId()).orElse(null);
            if (record != null) {
                record.setCompletedAt(now);
                if (record.getStartedAt() != null) {
                    long diff = java.time.Duration.between(record.getStartedAt(), now).toMinutes();
                    record.setActualDurationMinutes(Math.max(1, (int) diff));
                } else {
                    record.setStartedAt(room.getCleaningStartedAt() != null ? room.getCleaningStartedAt() : now.minusMinutes(standardMinutes));
                    long diff = java.time.Duration.between(record.getStartedAt(), now).toMinutes();
                    record.setActualDurationMinutes(Math.max(1, (int) diff));
                }
                record.setStatus(CleaningRecordStatus.SUBMITTED);
                roomCleaningRecordRepository.save(record);
            }
        } else {
            // Trường hợp nhân viên không bấm bắt đầu mà bấm thẳng dọn xong
            LocalDateTime start = room.getCleaningStartedAt() != null ? room.getCleaningStartedAt() : now.minusMinutes(standardMinutes);
            long diff = java.time.Duration.between(start, now).toMinutes();
            RoomCleaningRecord record = RoomCleaningRecord.builder()
                    .room(room)
                    .roomType(room.getRoomType())
                    .housekeeper(room.getAssignedHousekeeper() != null ? room.getAssignedHousekeeper() : actor)
                    .cleaningType("PERIODIC_VACANT".equals(room.getCleaningReason()) ? "PERIODIC" : "CHECKOUT")
                    .standardDurationMinutes(standardMinutes)
                    .startedAt(start)
                    .completedAt(now)
                    .actualDurationMinutes(Math.max(1, (int) diff))
                    .status(CleaningRecordStatus.SUBMITTED)
                    .isInterrupted(false)
                    .hasIncident(false)
                    .rejectionCount(0)
                    .build();
            record = roomCleaningRecordRepository.save(record);
            room.setActiveCleaningRecordId(record.getId());
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
            throw new IllegalArgumentException("Chỉ có thể duyệt sạch khi phòng đang ở trạng thái Chờ duyệt (INSPECTING)");
        }

        LocalDateTime now = LocalDateTime.now();
        if (room.getActiveCleaningRecordId() != null) {
            RoomCleaningRecord record = roomCleaningRecordRepository.findById(room.getActiveCleaningRecordId()).orElse(null);
            if (record != null) {
                record.setStatus(CleaningRecordStatus.APPROVED);
                record.setInspectedBy(actor);
                record.setInspectedAt(now);
                roomCleaningRecordRepository.save(record);
            }
        }

        room.setStatus(RoomStatus.AVAILABLE);
        room.setLastCleanedAt(now);
        room.setCleaningReason(null);
        room.setAssignedHousekeeper(null);
        room.setAssignedAt(null);
        room.setCleaningStartedAt(null);
        room.setActiveCleaningRecordId(null);
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "APPROVE_CLEAN", actor,
                "Phòng " + room.getRoomNumber() + " đã được duyệt sạch, sẵn sàng phục vụ");
        return toResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse rejectClean(Long id, String reason, User actor) {
        Room room = findById(id);
        if (room.getStatus() != RoomStatus.INSPECTING) {
            throw new IllegalArgumentException("Chỉ có thể yêu cầu dọn lại khi phòng đang ở trạng thái Chờ duyệt (INSPECTING)");
        }

        LocalDateTime now = LocalDateTime.now();
        if (room.getActiveCleaningRecordId() != null) {
            RoomCleaningRecord record = roomCleaningRecordRepository.findById(room.getActiveCleaningRecordId()).orElse(null);
            if (record != null) {
                record.setStatus(CleaningRecordStatus.REJECTED);
                record.setRejectionCount((record.getRejectionCount() != null ? record.getRejectionCount() : 0) + 1);
                record.setRejectionNote(reason);
                record.setInspectedBy(actor);
                record.setInspectedAt(now);
                roomCleaningRecordRepository.save(record);
            }
        }

        room.setStatus(RoomStatus.DIRTY);
        room.setCleaningStartedAt(null);
        room = roomRepository.save(room);
        auditLogService.log("Room", room.getId(), "REJECT_CLEAN", actor,
                "Yêu cầu dọn lại phòng " + room.getRoomNumber() + (reason != null && !reason.isBlank() ? ": " + reason : ""));
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

    // ===== Lịch dọn định kỳ phòng trống dài ngày =====

    @Override
    @Transactional
    public int triggerPeriodicCleaningCheck(User actor) {
        HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
        if (setting != null && Boolean.FALSE.equals(setting.getPeriodicCleaningEnabled())) {
            return 0; // Tính năng dọn định kỳ đã bị tắt bởi chủ cơ sở
        }
        int thresholdDays = (setting != null && setting.getPeriodicCleaningDays() != null && setting.getPeriodicCleaningDays() > 0)
                ? setting.getPeriodicCleaningDays()
                : 5;

        List<Room> availableRooms = roomRepository.findByStatus(RoomStatus.AVAILABLE);
        int count = 0;
        LocalDate today = LocalDate.now();

        for (Room room : availableRooms) {
            LocalDateTime baseTime = room.getLastCleanedAt();
            if (baseTime == null) {
                try {
                    Booking lastBooking = bookingRepository.findTopByRoomIdAndStatusOrderByCheckOutDateDesc(room.getId(), BookingStatus.CHECKED_OUT);
                    if (lastBooking != null && lastBooking.getCheckedOutAt() != null) {
                        baseTime = lastBooking.getCheckedOutAt();
                    } else if (lastBooking != null && lastBooking.getCheckOutDate() != null) {
                        baseTime = lastBooking.getCheckOutDate().atTime(12, 0);
                    }
                } catch (Exception ignored) {}
            }
            if (baseTime == null) {
                baseTime = room.getUpdatedAt() != null ? room.getUpdatedAt() : room.getCreatedAt();
            }
            if (baseTime == null) {
                baseTime = LocalDateTime.now();
            }

            long days = java.time.temporal.ChronoUnit.DAYS.between(baseTime.toLocalDate(), today);
            if (days >= thresholdDays) {
                room.setStatus(RoomStatus.DIRTY);
                room.setCleaningReason("PERIODIC_VACANT");
                room.setAssignedHousekeeper(null);
                room.setAssignedAt(null);
                roomRepository.save(room);
                count++;

                auditLogService.log("Room", room.getId(), "PERIODIC_CLEANING_TRIGGERED", actor,
                        "Phòng " + room.getRoomNumber() + " tự động chuyển sang Cần dọn (DIRTY) do để trống "
                        + days + " ngày không có khách (chu kỳ: " + thresholdDays + " ngày)");

                try {
                    notificationService.createForRoles(
                            NotificationType.ROOM_DIRTY,
                            "Dọn định kỳ phòng trống: " + room.getRoomNumber(),
                            "Phòng " + room.getRoomNumber() + " đã trống " + days + " ngày không có khách, cần làm sạch bụi định kỳ",
                            "ROOM", room.getId()
                    );
                } catch (Exception ignored) {}
            }
        }
        return count;
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

        // Tính số ngày phòng đã trống (nếu đang AVAILABLE hoặc lý do là PERIODIC_VACANT)
        Long vacantDays = null;
        if (room.getStatus() == RoomStatus.AVAILABLE || "PERIODIC_VACANT".equals(room.getCleaningReason())) {
            LocalDateTime baseTime = room.getLastCleanedAt();
            if (baseTime == null) {
                try {
                    Booking lastBooking = bookingRepository.findTopByRoomIdAndStatusOrderByCheckOutDateDesc(room.getId(), BookingStatus.CHECKED_OUT);
                    if (lastBooking != null && lastBooking.getCheckedOutAt() != null) {
                        baseTime = lastBooking.getCheckedOutAt();
                    } else if (lastBooking != null && lastBooking.getCheckOutDate() != null) {
                        baseTime = lastBooking.getCheckOutDate().atTime(12, 0);
                    }
                } catch (Exception ignored) {}
            }
            if (baseTime == null) {
                baseTime = room.getUpdatedAt() != null ? room.getUpdatedAt() : room.getCreatedAt();
            }
            if (baseTime != null) {
                vacantDays = Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(baseTime.toLocalDate(), today));
            }
        }

        // Định mức thời gian dọn dẹp theo loại phòng và lý do dọn
        Integer standardMin = 45;
        if (room.getRoomType() != null) {
            if ("PERIODIC_VACANT".equals(room.getCleaningReason())) {
                standardMin = room.getRoomType().getStandardPeriodicCleaningMinutes() != null
                        ? room.getRoomType().getStandardPeriodicCleaningMinutes() : 20;
            } else {
                standardMin = room.getRoomType().getStandardCheckoutCleaningMinutes() != null
                        ? room.getRoomType().getStandardCheckoutCleaningMinutes() : 45;
            }
        }
        boolean isCleaningInProgress = room.getStatus() == RoomStatus.DIRTY && room.getCleaningStartedAt() != null;

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
                .lastCleanedAt(room.getLastCleanedAt())
                .cleaningReason(room.getCleaningReason())
                .vacantDays(vacantDays)
                .cleaningStartedAt(room.getCleaningStartedAt())
                .activeCleaningRecordId(room.getActiveCleaningRecordId())
                .isCleaningInProgress(isCleaningInProgress)
                .standardCleaningMinutes(standardMin)
                .build();
    }
}

