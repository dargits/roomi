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
        User user = checkStaff(request);
        List<RoomResponse> rooms = status != null ? roomService.getByStatus(status) : roomService.getAll();

        // NCL-06-CN-004: Nhân viên buồng phòng khi đăng nhập chỉ thấy phần phòng được phân công cho mình và phần chưa ai phụ trách
        if (user.getRole() == Role.HOUSEKEEPER && (status == RoomStatus.DIRTY || status == RoomStatus.INSPECTING)) {
            rooms = rooms.stream()
                    .filter(r -> r.getAssignedHousekeeperId() == null || r.getAssignedHousekeeperId().equals(user.getId()))
                    .toList();
        }

        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomResponse> getById(@PathVariable Long id, HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(roomService.getById(id));
    }

    // Lấy danh sách phòng trống không xung đột lịch
    @GetMapping("/available")
    public ResponseEntity<List<RoomResponse>> getAvailableRooms(
            @RequestParam Long roomTypeId,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate checkInDate,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate checkOutDate,
            HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(roomService.getAvailableWithoutConflicts(roomTypeId, checkInDate, checkOutDate));
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

    // Housekeeping: đánh dấu phòng đã dọn sạch (OWNER, HOUSEKEEPER, RECEPTIONIST, ADMIN)
    @PutMapping("/{id}/mark-clean")
    public ResponseEntity<RoomResponse> markClean(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkHousekeeping(request);
        return ResponseEntity.ok(roomService.markClean(id, actor));
    }

    // Housekeeping: đánh dấu phòng cần dọn dẹp
    @PutMapping("/{id}/mark-dirty")
    public ResponseEntity<RoomResponse> markDirty(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkHousekeeping(request);
        return ResponseEntity.ok(roomService.markDirty(id, actor));
    }

    // NCL-06-CN-NEW: Housekeeper báo hoàn thành dọn, gửi kiểm tra (DIRTY → INSPECTING)
    @PutMapping("/{id}/submit-inspection")
    public ResponseEntity<RoomResponse> submitForInspection(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkHousekeeping(request);
        return ResponseEntity.ok(roomService.submitForInspection(id, actor));
    }

    // NCL-06-CN-NEW: Supervisor duyệt phòng sạch (INSPECTING → AVAILABLE)
    @PutMapping("/{id}/approve-clean")
    public ResponseEntity<RoomResponse> approveClean(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkSupervisor(request);
        return ResponseEntity.ok(roomService.approveClean(id, actor));
    }

    // NCL-06-CN-NEW: Phân công nhân viên dọn phòng
    @PutMapping("/{id}/assign-cleaner")
    public ResponseEntity<RoomResponse> assignCleaner(@PathVariable Long id,
                                                       @RequestParam Long housekeeperId,
                                                       HttpServletRequest request) {
        User actor = checkSupervisor(request);
        return ResponseEntity.ok(roomService.assignCleaner(id, housekeeperId, actor));
    }

    // NCL-06-CN-NEW: Hủy phân công
    @DeleteMapping("/{id}/assign-cleaner")
    public ResponseEntity<RoomResponse> unassignCleaner(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkSupervisor(request);
        return ResponseEntity.ok(roomService.unassignCleaner(id, actor));
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
            throw new UnauthorizedException("Tài khoản không có quyền! Chức năng này chỉ dành cho CHỦ CƠ SỞ (OWNER)");
        return user;
    }

    private User checkHousekeeping(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.HOUSEKEEPER && user.getRole() != Role.ADMIN && user.getRole() != Role.RECEPTIONIST))
            throw new UnauthorizedException("Tài khoản không có quyền! Yêu cầu vai trò: CHỦ CƠ SỞ, QUẢN TRỊ, LỄ TÂN hoặc BUỒNG PHÒNG");
        return user;
    }

    // Supervisor: OWNER, ADMIN, RECEPTIONIST có thể duyệt phòng sạch và phân công
    private User checkSupervisor(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN && user.getRole() != Role.RECEPTIONIST))
            throw new UnauthorizedException("Tài khoản không có quyền! Yêu cầu vai trò: CHỦ CƠ SỞ, QUẢN TRỊ hoặc LỄ TÂN");
        return user;
    }
}
