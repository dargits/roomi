package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.RoomTypeRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.model.RoomType;
import roomi.dev.model.User;
import roomi.dev.service.RoomTypeService;
import roomi.dev.util.AuthUtil;

import java.util.List;

/**
 * Controller quản lý loại phòng (RoomType) — NCL-02 (§1.2).
 *
 * Base URL: /api/v1/room-types
 *
 * Loại phòng là nền tảng để tạo phòng cụ thể và cấu hình giá theo mùa.
 * Thứ tự khởi tạo: Loại phòng → Phòng → Giá theo mùa → Đặt phòng.
 *
 * Phân quyền:
 *   - Xem danh sách loại phòng  : PUBLIC (khách chưa đăng nhập cũng truy cập được)
 *   - Tạo / Sửa / Xóa loại phòng: OWNER, ADMIN
 *
 * Endpoints:
 *   GET    /api/v1/room-types       — danh sách tất cả loại phòng  [PUBLIC]
 *   GET    /api/v1/room-types/{id}  — chi tiết một loại phòng       [PUBLIC]
 *   POST   /api/v1/room-types       — tạo loại phòng mới
 *   PUT    /api/v1/room-types/{id}  — sửa loại phòng
 *   DELETE /api/v1/room-types/{id}  — xóa loại phòng
 */
@RestController
@RequestMapping("/api/v1/room-types")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RoomTypeController {

    private final RoomTypeService roomTypeService;
    private final AuthUtil        authUtil;

    // ------------------------------------------------------------------ QUERIES

    /**
     * Lấy danh sách tất cả loại phòng.
     * Dùng bởi lễ tân khi tạo booking, chủ cơ sở khi cấu hình giá.
     * 
     * Public endpoint — không cần token:
     *   • Trang đặt phòng của khách (BookingPortal) cần load danh mục loại phòng khi chưa đăng nhập.
     *   • Dữ liệu không nhạy cảm (chỉ có tên và giá cơ bản).
     *
     * Ví dụ: GET /api/v1/room-types
     */
    @GetMapping
    public ResponseEntity<BaseResponse<List<RoomType>>> getAllRoomTypes() {
        return ResponseEntity.ok(BaseResponse.<List<RoomType>>builder()
                .mess("Thành công")
                .data(roomTypeService.getAllRoomTypes())
                .build());
    }

    /**
     * Lấy chi tiết một loại phòng theo ID.
     * 
     * Public endpoint — không cần token (cùng lý do với GET /).
     *
     * Ví dụ: GET /api/v1/room-types/2
     */
    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<RoomType>> getRoomTypeById(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<RoomType>builder()
                .mess("Thành công")
                .data(roomTypeService.getRoomTypeById(id))
                .build());
    }

    // ------------------------------------------------------------------ CREATE / UPDATE / DELETE

    /**
     * Tạo loại phòng mới (NCL-02, §1.2 bước 2).
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: POST /api/v1/room-types
     * Body: { "name": "VIP", "basePrice": 1500000, "capacity": 2, "description": "Phòng VIP..." }
     */
    @PostMapping
    public ResponseEntity<BaseResponse<RoomType>> createRoomType(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody RoomTypeRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER);

        return ResponseEntity.status(HttpStatus.CREATED).body(BaseResponse.<RoomType>builder()
                .mess("Tạo loại phòng thành công")
                .data(roomTypeService.createRoomType(request))
                .build());
    }

    /**
     * Cập nhật thông tin loại phòng (tên, giá cơ bản, sức chứa, mô tả).
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: PUT /api/v1/room-types/2
     */
    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<RoomType>> updateRoomType(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody RoomTypeRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER);

        return ResponseEntity.ok(BaseResponse.<RoomType>builder()
                .mess("Cập nhật loại phòng thành công")
                .data(roomTypeService.updateRoomType(id, request))
                .build());
    }

    /**
     * Xóa loại phòng khỏi hệ thống.
     * Chỉ xóa được nếu không còn phòng nào thuộc loại này.
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: DELETE /api/v1/room-types/2
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteRoomType(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token, User.Role.OWNER);

        roomTypeService.deleteRoomType(id);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa loại phòng thành công")
                .build());
    }
}
