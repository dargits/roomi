package roomi.dev.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.response.ActivityLogResponse;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.model.User;
import roomi.dev.service.ActivityLogService;
import roomi.dev.util.AuthUtil;

import java.util.List;

/**
 * Controller nhật ký hoạt động hệ thống (NCL-01 §4.2, §4.3).
 *
 * Base URL: /api/v1/activity-logs
 */
@RestController
@RequestMapping("/api/v1/activity-logs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ActivityLogController {

    private final ActivityLogService activityLogService;
    private final AuthUtil authUtil;

    /**
     * Lấy nhật ký hoạt động hệ thống.
     * Có thể lọc theo entityName & entityId hoặc userId.
     * Quyền: ADMIN
     */
    @GetMapping
    public ResponseEntity<BaseResponse<List<ActivityLogResponse>>> getLogs(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) String entityName,
            @RequestParam(required = false) Long entityId,
            @RequestParam(required = false) Long userId) {

        authUtil.requireRoles(token, User.Role.ADMIN);

        return ResponseEntity.ok(BaseResponse.<List<ActivityLogResponse>>builder()
                .mess("Thành công")
                .data(activityLogService.getLogs(entityName, entityId, userId))
                .build());
    }
}
