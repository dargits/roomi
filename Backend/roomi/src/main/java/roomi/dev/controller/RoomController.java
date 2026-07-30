package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.RoomRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.model.Room;
import roomi.dev.service.RoomService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rooms")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @GetMapping
    public ResponseEntity<BaseResponse<List<Room>>> getAllRooms() {
        return ResponseEntity.ok(BaseResponse.<List<Room>>builder()
                .mess("Thành công")
                .data(roomService.getAllRooms())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<Room>> getRoomById(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<Room>builder()
                .mess("Thành công")
                .data(roomService.getRoomById(id))
                .build());
    }

    @PostMapping
    public ResponseEntity<BaseResponse<Room>> createRoom(@Valid @RequestBody RoomRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(BaseResponse.<Room>builder()
                .mess("Tạo phòng thành công")
                .data(roomService.createRoom(request))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<Room>> updateRoom(@PathVariable Long id, @Valid @RequestBody RoomRequest request) {
        return ResponseEntity.ok(BaseResponse.<Room>builder()
                .mess("Cập nhật phòng thành công")
                .data(roomService.updateRoom(id, request))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa phòng thành công")
                .build());
    }

    /**
     * Đồng bộ trạng thái tất cả phòng theo booking CHECKED_IN đang hoạt động hôm nay.
     * Gọi endpoint này sau mỗi lần load sơ đồ phòng hoặc khi nghi ngờ dữ liệu lệch.
     */
    @PostMapping("/sync-status")
    public ResponseEntity<BaseResponse<String>> syncRoomStatuses() {
        int updated = roomService.syncRoomStatuses();
        return ResponseEntity.ok(BaseResponse.<String>builder()
                .mess("Đồng bộ trạng thái phòng thành công")
                .data("Đã cập nhật " + updated + " phòng")
                .build());
    }
}
