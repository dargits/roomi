package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import plant.stay.model.AuditLog;
import plant.stay.model.User;
import plant.stay.repository.AuditLogRepository;
import plant.stay.service.AuditLogService;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    public void log(String entityName, Long entityId, String action, User actor, String detail) {
        AuditLog log = AuditLog.builder()
                .entityName(entityName)
                .entityId(entityId)
                .action(action)
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .detailJson(detail)
                .build();
        auditLogRepository.save(log);
    }
}
