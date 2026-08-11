package roomi.dev.service;

import roomi.dev.dto.response.ActivityLogResponse;
import roomi.dev.model.User;

import java.util.List;

public interface ActivityLogService {
    void log(User user, String action, String entityName, Long entityId, String detail);
    List<ActivityLogResponse> getLogs(String entityName, Long entityId, Long userId);
}
