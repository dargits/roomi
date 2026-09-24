package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.AuditLog;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.AuditLogRepository;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/audit-logs")
@CrossOrigin("*")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) String entity,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Chỉ OWNER hoặc ADMIN mới có quyền xem audit log");

        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.atTime(23, 59, 59) : null;

        if (page != null) {
            int pageSize = (size != null && size > 0) ? size : 20;
            Pageable pageable = PageRequest.of(page, pageSize, Sort.by(Sort.Direction.DESC, "timestamp"));
            return ResponseEntity.ok(auditLogRepository.findWithFiltersPaged(entity, actorId, fromDt, toDt, pageable).map(this::toMap));
        }

        List<AuditLog> logs = auditLogRepository.findWithFilters(entity, actorId, fromDt, toDt);
        return ResponseEntity.ok(toMapList(logs));
    }

    public ResponseEntity<?> getAll(String entity, Long actorId, LocalDate from, LocalDate to, HttpServletRequest request) {
        return getAll(entity, actorId, from, to, null, null, request);
    }

    /**
     * NCL-12-CN-006: Nhật ký truy cập dữ liệu cá nhân (QTN-24).
     * Lọc các action: EXPORT_STAY_DECLARATION, DELETE_PERSONAL_DATA, VIEW_GUEST_DETAIL.
     * Chỉ OWNER và ADMIN được xem.
     */
    @GetMapping("/personal-data")
    public ResponseEntity<?> getPersonalDataLogs(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Chỉ Chủ cơ sở hoặc Quản trị viên mới được xem nhật ký dữ liệu cá nhân");

        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.atTime(23, 59, 59) : null;

        if (page != null) {
            int pageSize = (size != null && size > 0) ? size : 20;
            Pageable pageable = PageRequest.of(page, pageSize, Sort.by(Sort.Direction.DESC, "timestamp"));
            return ResponseEntity.ok(auditLogRepository.findPersonalDataLogsPaged(actorId, fromDt, toDt, pageable).map(this::toMap));
        }

        // Lấy tất cả log liên quan dữ liệu cá nhân
        List<AuditLog> allLogs = auditLogRepository.findPersonalDataLogs(actorId, fromDt, toDt);
        return ResponseEntity.ok(toMapList(allLogs));
    }

    public ResponseEntity<?> getPersonalDataLogs(Long actorId, LocalDate from, LocalDate to, HttpServletRequest request) {
        return getPersonalDataLogs(actorId, from, to, null, null, request);
    }

    private Map<String, Object> toMap(AuditLog l) {
        Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", l.getId());
        map.put("entityName", l.getEntityName());
        map.put("entityId", l.getEntityId() != null ? l.getEntityId() : "");
        map.put("action", l.getAction());
        map.put("actorId", l.getActor() != null ? l.getActor().getId() : null);
        map.put("actor", l.getActor() != null ? l.getActor().getName() : "system");
        map.put("actorRole", l.getActor() != null ? l.getActor().getRole().name() : "");
        map.put("timestamp", l.getTimestamp() != null ? l.getTimestamp().toString() : "");
        map.put("detail", l.getDetailJson() != null ? l.getDetailJson() : "");
        return map;
    }

    private List<Map<String, Object>> toMapList(List<AuditLog> logs) {
        return logs.stream().map(this::toMap).collect(Collectors.toList());
    }
}

