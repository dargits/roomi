package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.dto.response.ActivityLogResponse;
import roomi.dev.model.ActivityLog;
import roomi.dev.model.User;
import roomi.dev.repository.ActivityLogRepository;
import roomi.dev.repository.UserRepository;
import roomi.dev.service.ActivityLogService;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityLogServiceImpl implements ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(User user, String action, String entityName, Long entityId, String detail) {
        try {
            if (user == null || user.getId() == null) return;
            User managedUser = userRepository.findById(user.getId()).orElse(user);

            ActivityLog activityLog = ActivityLog.builder()
                    .user(managedUser)
                    .action(action)
                    .entityName(entityName)
                    .entityId(entityId != null ? entityId : 0L)
                    .detail(detail)
                    .build();

            activityLogRepository.save(activityLog);
        } catch (Exception e) {
            log.error("Lỗi khi lưu ActivityLog (bỏ qua để tránh ảnh hưởng luồng chính): {}", e.getMessage());
        }
    }

    @Override
    public List<ActivityLogResponse> getLogs(String entityName, Long entityId, Long userId) {
        List<ActivityLog> logs;

        if (entityName != null && !entityName.isBlank() && entityId != null) {
            logs = activityLogRepository.findByEntityNameAndEntityIdOrderByCreatedAtDesc(entityName.trim(), entityId);
        } else if (userId != null) {
            logs = activityLogRepository.findByUserIdOrderByCreatedAtDesc(userId);
        } else {
            logs = activityLogRepository.findAllByOrderByCreatedAtDesc();
        }

        return logs.stream().map(this::toResponse).toList();
    }

    private ActivityLogResponse toResponse(ActivityLog log) {
        return ActivityLogResponse.builder()
                .id(log.getId())
                .userId(log.getUser() != null ? log.getUser().getId() : null)
                .userFullName(log.getUser() != null ? log.getUser().getFullName() : null)
                .userRole(log.getUser() != null && log.getUser().getRole() != null ? log.getUser().getRole().name() : null)
                .action(log.getAction())
                .entityName(log.getEntityName())
                .entityId(log.getEntityId())
                .detail(log.getDetail())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
