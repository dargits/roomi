package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.RoomRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.RoomResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.RoomStatus;
import plant.stay.model.User;
import plant.stay.service.RoomService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rooms")
@CrossOrigin("*")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final AuthUtil authUtil;

    // Lấy danh sách phòng — có thể lọc theo status
    @GetMapping
    public ResponseEntity<List<RoomResponse>> getAll(
            @RequestParam(required = false) RoomStatus status,
            HttpServletRequest request) {
        checkStaff(request);
        if (status != null) {
            return ResponseEntity.ok(roomService.getByStatus(status));
        }
        return ResponseEntity.ok(roomService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomResponse> getById(@PathVariable Long id, HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(roomService.getById(id));
    }

    @PostMapping
    public ResponseEntity<RoomResponse> create(@Valid @RequestBody RoomRequest roomRequest,
                                               HttpServletRequest request) {
        User actor = checkOwner(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(roomService.create(roomRequest, actor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomResponse> update(@PathVariable Long id,
                                               @Valid @RequestBody RoomRequest roomRequest,
                                               HttpServletRequest request) {
        User actor = checkOwner(request);
        return ResponseEntity.ok(roomService.update(id, roomRequest, actor));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> delete(@PathVariable Long id, HttpServletRequest request) {
        checkOwner(request);
        return ResponseEntity.ok(roomService.delete(id));
    }

    // Housekeeping: đánh dấu phòng đã dọn sạch (OWNER hoặc HOUSEKEEPER)
    @PutMapping("/{id}/mark-clean")
    public ResponseEntity<RoomResponse> markClean(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkHousekeeping(request);
        return ResponseEntity.ok(roomService.markClean(id, actor));
    }

    // Khóa phòng bảo trì (chỉ OWNER)
    @PutMapping("/{id}/maintenance")
    public ResponseEntity<RoomResponse> setMaintenance(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkOwner(request);
        return ResponseEntity.ok(roomService.setMaintenance(id, actor));
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Vui lòng đăng nhập");
        return user;
    }

    private User checkOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || user.getRole() != Role.OWNER)
            throw new UnauthorizedException("Chỉ OWNER mới có quyền thực hiện chức năng này");
        return user;
    }

    private User checkHousekeeping(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.HOUSEKEEPER
                && user.getRole() != Role.RECEPTIONIST))
            throw new UnauthorizedException("Không có quyền thực hiện chức năng này");
        return user;
    }
}
