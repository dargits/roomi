package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.RoomTypeRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.model.RoomType;
import roomi.dev.service.RoomTypeService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/room-types")
@RequiredArgsConstructor
public class RoomTypeController {

    private final RoomTypeService roomTypeService;

    @GetMapping
    public ResponseEntity<BaseResponse<List<RoomType>>> getAllRoomTypes() {
        return ResponseEntity.ok(BaseResponse.<List<RoomType>>builder()
                .mess("Thành công")
                .data(roomTypeService.getAllRoomTypes())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<RoomType>> getRoomTypeById(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<RoomType>builder()
                .mess("Thành công")
                .data(roomTypeService.getRoomTypeById(id))
                .build());
    }

    @PostMapping
    public ResponseEntity<BaseResponse<RoomType>> createRoomType(@Valid @RequestBody RoomTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(BaseResponse.<RoomType>builder()
                .mess("Tạo loại phòng thành công")
                .data(roomTypeService.createRoomType(request))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<RoomType>> updateRoomType(@PathVariable Long id, @Valid @RequestBody RoomTypeRequest request) {
        return ResponseEntity.ok(BaseResponse.<RoomType>builder()
                .mess("Cập nhật loại phòng thành công")
                .data(roomTypeService.updateRoomType(id, request))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteRoomType(@PathVariable Long id) {
        roomTypeService.deleteRoomType(id);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa loại phòng thành công")
                .build());
    }
}
