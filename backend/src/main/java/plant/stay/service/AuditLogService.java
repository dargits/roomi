package plant.stay.service;

import plant.stay.model.User;

public interface AuditLogService {
    void log(String entityName, Long entityId, String action, User actor, String detail);
}
