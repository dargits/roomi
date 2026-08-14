package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
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
            HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Chỉ OWNER hoặc ADMIN mới có quyền xem audit log");

        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.atTime(23, 59, 59) : null;

        List<AuditLog> logs = auditLogRepository.findWithFilters(entity, actorId, fromDt, toDt);
        return ResponseEntity.ok(logs.stream().map(l -> Map.of(
                "id", l.getId(),
                "entityName", l.getEntityName(),
                "entityId", l.getEntityId() != null ? l.getEntityId() : "",
                "action", l.getAction(),
                "actor", l.getActor() != null ? l.getActor().getName() : "system",
                "timestamp", l.getTimestamp().toString(),
                "detail", l.getDetailJson() != null ? l.getDetailJson() : ""
        )).collect(Collectors.toList()));
    }
}
