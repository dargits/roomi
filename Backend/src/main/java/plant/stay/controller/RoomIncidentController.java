package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.RoomIncidentReportRequest;
import plant.stay.dto.request.RoomIncidentResolveRequest;
import plant.stay.dto.response.RoomIncidentResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.UnauthorizedException;
import org.springframework.http.HttpStatus;
import plant.stay.model.IncidentStatus;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.RoomIncidentService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/room-incidents")
@RequiredArgsConstructor
public class RoomIncidentController {

    private final RoomIncidentService roomIncidentService;
    private final AuthUtil authUtil;

    // Buồng phòng hoặc nhân viên báo sự cố
    @PostMapping("/report")
    public ResponseEntity<RoomIncidentResponse> reportIncident(
            @Valid @RequestBody RoomIncidentReportRequest req,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(roomIncidentService.reportIncident(req, actor));
    }

    // Chủ cơ sở xử lý sự cố
    @PutMapping("/{id}/resolve")
    public ResponseEntity<RoomIncidentResponse> resolveIncident(
            @PathVariable Long id,
            @Valid @RequestBody RoomIncidentResolveRequest req,
            HttpServletRequest request) {
        User actor = checkOwner(request);
        return ResponseEntity.ok(roomIncidentService.resolveIncident(id, req, actor));
    }

    // Danh sách sự cố
    @GetMapping
    public ResponseEntity<List<RoomIncidentResponse>> getIncidents(
            @RequestParam(required = false) IncidentStatus status,
            @RequestParam(required = false) Long roomId,
            HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(roomIncidentService.getIncidents(status, roomId));
    }

    // Chi tiết sự cố
    @GetMapping("/{id}")
    public ResponseEntity<RoomIncidentResponse> getIncidentById(
            @PathVariable Long id,
            HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(roomIncidentService.getIncidentById(id));
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Vui lòng đăng nhập");
        return user;
    }

    private User checkOwner(HttpServletRequest request) {
        User user = checkStaff(request);
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN) {
            throw new BusinessException("Chỉ Chủ cơ sở mới có quyền xử lý sự cố phòng!", HttpStatus.FORBIDDEN);
        }
        return user;
    }
}
