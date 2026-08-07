package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.RoomRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.model.Room;
import roomi.dev.model.User;
import roomi.dev.service.ActivityLogService;
import roomi.dev.service.RoomService;
import roomi.dev.util.AuthUtil;

import java.util.List;

/**
 * Controller quản lý phòng — CRUD và đồng bộ trạng thái buồng phòng.
 *
 * Base URL: /api/v1/rooms
 *
 * Chu trình trạng thái phòng (§5.2):
 *   AVAILABLE → OCCUPIED (khi check-in)
 *   OCCUPIED  → NEEDS_CLEANING (khi check-out)
 *   NEEDS_CLEANING → AVAILABLE (khi nhân viên buồng phòng dọn xong)
 *   Bất kỳ → MAINTENANCE (khi chủ cơ sở khóa bảo trì)
 *
 * Phân quyền:
 *   - Xem danh sách / chi tiết phòng: PUBLIC (BookingPortal dùng khi chưa đăng nhập)
 *   - Tạo / Sửa / Xóa phòng         : OWNER, ADMIN
 *   - Đồng bộ trạng thái            : OWNER, ADMIN
 *   - Cập nhật trạng thái dọn phòng  : HOUSEKEEPER, OWNER, RECEPTIONIST
 *
 * Endpoints:
 *   GET    /api/v1/rooms             — danh sách tất cả phòng (kèm tự đồng bộ trạng thái) [PUBLIC]
 *   GET    /api/v1/rooms/{id}        — chi tiết một phòng                                  [PUBLIC]
 *   POST   /api/v1/rooms             — tạo phòng mới
 *   PUT    /api/v1/rooms/{id}        — sửa thông tin phòng
 *   DELETE /api/v1/rooms/{id}        — xóa phòng (nếu chưa có lịch sử đặt)
 *   POST   /api/v1/rooms/sync-status — đồng bộ trạng thái phòng theo booking hôm nay
 *   PATCH  /api/v1/rooms/{id}/status — nhân viên buồng phòng cập nhật trạng thái dọn
 */
@RestController
@RequestMapping("/api/v1/rooms")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService        roomService;
    private final AuthUtil           authUtil;
    private final ActivityLogService activityLogService;

    // ------------------------------------------------------------------ QUERIES

    /**
     * Lấy danh sách toàn bộ phòng, sắp xếp theo tầng và số phòng.
     * Tự động đồng bộ trạng thái phòng theo booking CHECKED_IN của ngày hôm nay.
     *
     * Public endpoint — không cần token:
     *   • BookingPortal ghi đ để lọc bỏ phòng đầy hoặc inactive trước khi hiển thị cho khách.
     *   • Nhân viên có token sẽ gọi được với token, khách không token cũng gọi được.
     *
     * Ví dụ: GET /api/v1/rooms
     */
    @GetMapping
    public ResponseEntity<BaseResponse<List<Room>>> getAllRooms() {
        return ResponseEntity.ok(BaseResponse.<List<Room>>builder()
                .mess("Thành công")
                .data(roomService.getAllRooms())
                .build());
    }

    /**
     * Lấy chi tiết một phòng theo ID.
     * 
     * Public endpoint — không cần token (cùng lý do với GET /).
     *
     * Ví dụ: GET /api/v1/rooms/5
     */
    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<Room>> getRoomById(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<Room>builder()
                .mess("Thành công")
                .data(roomService.getRoomById(id))
                .build());
    }

    // ------------------------------------------------------------------ CREATE / UPDATE / DELETE

    /**
     * Tạo phòng mới (NCL-02, §1.2).
     * Phòng sau khi tạo có trạng thái mặc định AVAILABLE.
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: POST /api/v1/rooms
     * Body: { "roomNumber": "101", "roomTypeId": 2, "floor": "1", "note": "" }
     */
    @PostMapping
    public ResponseEntity<BaseResponse<Room>> createRoom(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody RoomRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER);

        return ResponseEntity.status(HttpStatus.CREATED).body(BaseResponse.<Room>builder()
                .mess("Tạo phòng thành công")
                .data(roomService.createRoom(request))
                .build());
    }

    /**
     * Cập nhật thông tin phòng (số phòng, tầng, loại phòng, ghi chú).
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: PUT /api/v1/rooms/5
     */
    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<Room>> updateRoom(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody RoomRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER);

        return ResponseEntity.ok(BaseResponse.<Room>builder()
                .mess("Cập nhật phòng thành công")
                .data(roomService.updateRoom(id, request))
                .build());
    }

    /**
     * Xóa phòng khỏi hệ thống.
     * Điều kiện: phòng chưa có lịch sử đặt phòng nào.
     * Nếu đã có booking, phải hủy/chuyển booking trước mới xóa được.
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: DELETE /api/v1/rooms/5
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteRoom(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token, User.Role.OWNER);

        roomService.deleteRoom(id);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa phòng thành công")
                .build());
    }

    // ------------------------------------------------------------------ STATUS MANAGEMENT

    /**
     * Cập nhật trạng thái dọn dẹp hoặc bảo trì của một phòng.
     * Thường do nhân viên buồng phòng gọi để đổi NEEDS_CLEANING → AVAILABLE sau khi dọn xong,
     * hoặc do chủ cơ sở đổi sang MAINTENANCE.
     * Quyền: HOUSEKEEPER, OWNER, RECEPTIONIST
     *
     * Ví dụ: PATCH /api/v1/rooms/3/status?status=AVAILABLE
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<BaseResponse<Room>> updateRoomStatus(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @RequestParam String status) {

        String uppercaseStatus = status.trim().toUpperCase();
        if ("MAINTENANCE".equals(uppercaseStatus)) {
            // Khóa bảo trì -> Chủ cơ sở (OWNER) hoặc Quản trị (ADMIN)
            authUtil.requireRoles(token, User.Role.OWNER, User.Role.ADMIN);
        } else {
            // Hoàn tất dọn dẹp phòng (HOUSEKEEPER) hoặc Hoàn tất bảo trì (OWNER, ADMIN)
            authUtil.requireRoles(token, User.Role.HOUSEKEEPER, User.Role.OWNER, User.Role.ADMIN);
        }

        User currentUser = authUtil.getUserFromToken(token);
        Room room = roomService.updateRoomStatus(id, uppercaseStatus);

        activityLogService.log(currentUser, "ĐỔI TRẠNG THÁI PHÒNG", "ROOM", id,
                "Cập nhật trạng thái phòng " + (room != null ? room.getRoomNumber() : id) + " sang " + status);

        return ResponseEntity.ok(BaseResponse.<Room>builder()
                .mess("Cập nhật trạng thái phòng thành công")
                .data(room)
                .build());
    }

    /**
     * Đồng bộ trạng thái tất cả phòng theo booking CHECKED_IN đang hoạt động hôm nay.
     * Gọi endpoint này sau mỗi lần load sơ đồ phòng hoặc khi nghi ngờ dữ liệu lệch.
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: POST /api/v1/rooms/sync-status
     */
    @PostMapping("/sync-status")
    public ResponseEntity<BaseResponse<String>> syncRoomStatuses(
            @RequestHeader("Authorization") String token) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST, User.Role.HOUSEKEEPER, User.Role.ACCOUNTANT);

        int updated = roomService.syncRoomStatuses();
        return ResponseEntity.ok(BaseResponse.<String>builder()
                .mess("Đồng bộ trạng thái phòng thành công")
                .data("Đã cập nhật " + updated + " phòng")
                .build());
    }
}
