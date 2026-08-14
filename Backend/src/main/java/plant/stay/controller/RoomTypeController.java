package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.RoomTypeRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.RoomTypeResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.RoomTypeService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/room-types")
@CrossOrigin("*")
public class RoomTypeController {

    @Autowired
    private RoomTypeService roomTypeService;

    @Autowired
    private AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<RoomTypeResponse>> getAll(HttpServletRequest request) {
        checkOwner(request);
        return ResponseEntity.ok(roomTypeService.getAllRoomTypes());
    }

    @GetMapping("/public")
    public ResponseEntity<List<RoomTypeResponse>> getPublicAll() {
        return ResponseEntity.ok(roomTypeService.getActiveRoomTypes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomTypeResponse> getById(@PathVariable Long id, HttpServletRequest request) {
        checkOwner(request);
        return ResponseEntity.ok(roomTypeService.getRoomTypeById(id));
    }

    @PostMapping
    public ResponseEntity<RoomTypeResponse> create(
            @Valid @RequestBody RoomTypeRequest requestDto, 
            HttpServletRequest request) {
        checkOwner(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(roomTypeService.createRoomType(requestDto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomTypeResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RoomTypeRequest requestDto, 
            HttpServletRequest request) {
        checkOwner(request);
        return ResponseEntity.ok(roomTypeService.updateRoomType(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> delete(@PathVariable Long id, HttpServletRequest request) {
        checkOwner(request);
        roomTypeService.deleteRoomType(id);
        return ResponseEntity.ok(new MessageResponse("Đã xóa loại phòng thành công"));
    }

    private User checkOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || user.getRole() != Role.OWNER) {
            throw new UnauthorizedException("Chỉ chủ sở hữu (OWNER) mới có quyền truy cập chức năng này.");
        }
        return user;
    }
}
