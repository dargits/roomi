package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.CleaningNotification;
import roomi.dev.model.Room;
import roomi.dev.repository.CleaningNotificationRepository;
import roomi.dev.repository.RoomRepository;
import roomi.dev.service.CleaningNotificationService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CleaningNotificationServiceImpl implements CleaningNotificationService {

    private final CleaningNotificationRepository cleaningNotificationRepository;
    private final RoomRepository roomRepository;

    @Override
    @Transactional
    public List<CleaningNotification> getUnreadNotifications() {
        // 1. Lấy danh sách tất cả các phòng hiện tại
        List<Room> allRooms = roomRepository.findAll();
        
        // Nhóm các phòng theo ID và lọc ra các phòng đang NEEDS_CLEANING
        Map<Long, Room> roomMap = allRooms.stream()
                .collect(Collectors.toMap(Room::getId, r -> r));
        
        Set<Long> needsCleaningRoomIds = allRooms.stream()
                .filter(r -> r.getStatus() == Room.Status.NEEDS_CLEANING)
                .map(Room::getId)
                .collect(Collectors.toSet());

        // 2. Lấy tất cả thông báo trong DB
        List<CleaningNotification> allNotifications = cleaningNotificationRepository.findAll();

        // Xóa các thông báo của các phòng không còn ở trạng thái NEEDS_CLEANING
        for (CleaningNotification notif : allNotifications) {
            if (!needsCleaningRoomIds.contains(notif.getRoomId())) {
                cleaningNotificationRepository.delete(notif);
            }
        }

        // Tạo bản đồ các thông báo hiện tại theo roomId sau khi đã dọn dẹp stales
        Map<Long, List<CleaningNotification>> notifMap = cleaningNotificationRepository.findAll().stream()
                .collect(Collectors.groupingBy(CleaningNotification::getRoomId));

        // 3. Đối với mỗi phòng cần dọn, nếu chưa có thông báo nào thì tạo mới
        for (Long roomId : needsCleaningRoomIds) {
            List<CleaningNotification> existingNotifs = notifMap.get(roomId);
            if (existingNotifs == null || existingNotifs.isEmpty()) {
                Room room = roomMap.get(roomId);
                CleaningNotification newNotif = CleaningNotification.builder()
                        .roomId(roomId)
                        .roomNumber(room.getRoomNumber())
                        .message("Phòng " + room.getRoomNumber() + " đang cần dọn dẹp!")
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                cleaningNotificationRepository.save(newNotif);
            }
        }

        // 4. Trả về tất cả thông báo chưa đọc
        return cleaningNotificationRepository.findByIsRead(false);
    }

    @Override
    @Transactional
    public void markAsRead(Long id) {
        CleaningNotification notif = cleaningNotificationRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông báo", ErrorCode.INVALID_INPUT));
        notif.setIsRead(true);
        cleaningNotificationRepository.save(notif);
    }

    @Override
    @Transactional
    public void markAllAsRead() {
        List<CleaningNotification> unreadNotifs = cleaningNotificationRepository.findByIsRead(false);
        for (CleaningNotification notif : unreadNotifs) {
            notif.setIsRead(true);
        }
        cleaningNotificationRepository.saveAll(unreadNotifs);
    }
}
