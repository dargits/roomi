package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.NotificationResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.NotificationService;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationUserPrefRepository userPrefRepository;
    private final UserRepository userRepository;

    // =========================================================================
    // CREATE
    // =========================================================================

    @Override
    @Transactional
    public void createForRoles(NotificationType type, String title, String body, String refType, Long refId) {
        Set<Role> targetRoles = type.getDefaultRoles();
        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.isActive() && targetRoles.contains(u.getRole()))
                .collect(Collectors.toList());

        for (User user : users) {
            // Kiem tra xem user co tat loai nay khong (chi voi loai khong bat buoc)
            if (!type.isMandatory()) {
                Optional<NotificationUserPref> pref = userPrefRepository.findByUserIdAndType(user.getId(), type);
                if (pref.isPresent() && Boolean.FALSE.equals(pref.get().getEnabled())) {
                    continue; // User da tat loai thong bao nay
                }
            }
            createNotification(user, type, title, body, refType, refId);
        }
    }

    @Override
    @Transactional
    public void createForUser(Long userId, NotificationType type, String title, String body, String refType, Long refId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay user #" + userId));
        createNotification(user, type, title, body, refType, refId);
    }

    private void createNotification(User user, NotificationType type, String title, String body, String refType, Long refId) {
        try {
            Notification n = Notification.builder()
                    .user(user)
                    .type(type)
                    .title(title)
                    .body(body)
                    .refType(refType)
                    .refId(refId)
                    .isRead(false)
                    .build();
            notificationRepository.save(n);
        } catch (Exception e) {
            log.error("[Notification] Loi khi tao thong bao cho user #{}: {}", user.getId(), e.getMessage());
        }
    }

    // =========================================================================
    // QUERY
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(Long userId, NotificationType typeFilter, Boolean unreadOnly, Pageable pageable) {
        Page<Notification> page;
        if (typeFilter != null) {
            page = notificationRepository.findByUserIdAndTypeOrderByCreatedAtDesc(userId, typeFilter, pageable);
        } else if (Boolean.TRUE.equals(unreadOnly)) {
            page = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, pageable);
        } else {
            page = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return page.map(this::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getLatest5(Long userId) {
        Pageable top5 = PageRequest.of(0, 5);
        return notificationRepository.findTop5ByUserIdOrderByCreatedAtDesc(userId, top5)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    // =========================================================================
    // MARK READ
    // =========================================================================

    @Override
    @Transactional
    public void markRead(Long userId, Long notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay thong bao #" + notificationId));
        if (!n.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Khong co quyen cap nhat thong bao nay");
        }
        n.setIsRead(true);
        notificationRepository.save(n);
    }

    @Override
    @Transactional
    public void markAllRead(Long userId) {
        notificationRepository.markAllReadByUserId(userId);
    }

    // =========================================================================
    // PREFERENCES
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getUserPreferences(Long userId, Role userRole) {
        List<Map<String, Object>> result = new ArrayList<>();
        Map<NotificationType, NotificationUserPref> prefMap = userPrefRepository.findByUserId(userId)
                .stream().collect(Collectors.toMap(NotificationUserPref::getType, p -> p));

        for (NotificationType type : NotificationType.values()) {
            // Chi hien cac loai thong bao co the ap dung voi role nay
            if (!type.getDefaultRoles().contains(userRole)) {
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", type.name());
            item.put("mandatory", type.isMandatory());
            NotificationUserPref pref = prefMap.get(type);
            boolean enabled = pref == null ? true : Boolean.TRUE.equals(pref.getEnabled());
            item.put("enabled", enabled);
            result.add(item);
        }
        return result;
    }

    @Override
    @Transactional
    public void updateUserPreference(Long userId, NotificationType type, boolean enabled) {
        if (type.isMandatory()) {
            throw new IllegalArgumentException("Loai thong bao nay bat buoc, khong the tat.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay user #" + userId));
        NotificationUserPref pref = userPrefRepository.findByUserIdAndType(userId, type)
                .orElseGet(() -> NotificationUserPref.builder().user(user).type(type).build());
        pref.setEnabled(enabled);
        userPrefRepository.save(pref);
    }

    // =========================================================================
    // MAPPER
    // =========================================================================

    private NotificationResponse toDto(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .body(n.getBody())
                .refType(n.getRefType())
                .refId(n.getRefId())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
