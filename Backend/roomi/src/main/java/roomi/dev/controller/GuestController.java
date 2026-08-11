package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.GuestRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.GuestResponse;
import roomi.dev.model.User;
import roomi.dev.service.GuestService;
import roomi.dev.util.AuthUtil;

import java.util.List;

/**
 * Controller quản lý khách hàng và lịch sử lưu trú — NCL-04 (§2.2, §3).
 *
 * Base URL: /api/v1/guests
 *
 * Thông tin khách bao gồm dữ liệu cá nhân (họ tên, CCCD, SĐT, email) — cần bảo vệ.
 * Khách được tạo tự động khi lễ tân tạo booking (findOrCreateGuest trong BookingService).
 * Endpoint này dùng để tra cứu, chỉnh sửa thông tin hoặc xem lịch sử lưu trú.
 *
 * Phân quyền:
 *   - Xem / tìm kiếm khách : OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
 *   - Tạo / Sửa khách      : OWNER, RECEPTIONIST
 *   - Xóa khách            : OWNER, ADMIN
 *
 * Endpoints:
 *   GET    /api/v1/guests               — danh sách tất cả khách
 *   GET    /api/v1/guests/{id}          — chi tiết một khách
 *   GET    /api/v1/guests/phone/{phone} — tìm khách theo SĐT (walk-in nhanh)
 *   GET    /api/v1/guests/search        — tìm khách theo tên
 *   POST   /api/v1/guests               — tạo khách mới thủ công
 *   PUT    /api/v1/guests/{id}          — sửa thông tin khách
 *   DELETE /api/v1/guests/{id}          — xóa khách
 */
@RestController
@RequestMapping("/api/v1/guests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GuestController {

    private final GuestService guestService;
    private final AuthUtil     authUtil;

    // ------------------------------------------------------------------ QUERIES

    /**
     * Lấy danh sách tất cả khách hàng.
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
     *
     * Ví dụ: GET /api/v1/guests
     */
    @GetMapping
    public ResponseEntity<BaseResponse<List<GuestResponse>>> getAllGuests(
            @RequestHeader("Authorization") String token) {

        authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST,
                User.Role.ACCOUNTANT);

        return ResponseEntity.ok(BaseResponse.<List<GuestResponse>>builder()
                .mess("Thành công")
                .data(guestService.getAllGuests())
                .build());
    }

    /**
     * Lấy chi tiết một khách theo ID.
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
     *
     * Ví dụ: GET /api/v1/guests/7
     */
    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<GuestResponse>> getGuestById(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST,
                User.Role.ACCOUNTANT);

        return ResponseEntity.ok(BaseResponse.<GuestResponse>builder()
                .mess("Thành công")
                .data(guestService.getGuestById(id))
                .build());
    }

    /**
     * Tìm khách theo số điện thoại — dùng khi lễ tân check nhanh khách walk-in.
     * Giúp tránh tạo trùng khách khi đặt phòng mới.
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
     *
     * Ví dụ: GET /api/v1/guests/phone/0901234567
     */
    @GetMapping("/phone/{phone}")
    public ResponseEntity<BaseResponse<GuestResponse>> getGuestByPhone(
            @RequestHeader("Authorization") String token,
            @PathVariable String phone) {

        authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST,
                User.Role.ACCOUNTANT);

        return ResponseEntity.ok(BaseResponse.<GuestResponse>builder()
                .mess("Thành công")
                .data(guestService.getGuestByPhone(phone))
                .build());
    }

    /**
     * Tìm khách theo tên (contains, ignore case) — dùng để tra cứu khách quen.
     * Quyền: OWNER, RECEPTIONIST, ACCOUNTANT, ADMIN
     *
     * Ví dụ: GET /api/v1/guests/search?name=nguyen
     */
    @GetMapping("/search")
    public ResponseEntity<BaseResponse<List<GuestResponse>>> searchByName(
            @RequestHeader("Authorization") String token,
            @RequestParam String name) {

        authUtil.requireRoles(token,
                User.Role.OWNER, User.Role.RECEPTIONIST,
                User.Role.ACCOUNTANT);

        return ResponseEntity.ok(BaseResponse.<List<GuestResponse>>builder()
                .mess("Thành công")
                .data(guestService.searchByName(name))
                .build());
    }

    // ------------------------------------------------------------------ CREATE / UPDATE / DELETE

    /**
     * Tạo khách mới thủ công.
     * Thông thường khách được tạo tự động khi tạo booking (findOrCreateGuest).
     * Endpoint này dùng khi cần tạo trước hồ sơ khách.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: POST /api/v1/guests
     * Body: { "fullName": "Nguyễn Văn A", "phone": "0901...", "idNumber": "012345..." }
     */
    @PostMapping
    public ResponseEntity<BaseResponse<GuestResponse>> createGuest(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody GuestRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                BaseResponse.<GuestResponse>builder()
                        .mess("Tạo khách hàng thành công")
                        .data(guestService.createGuest(request))
                        .build());
    }

    /**
     * Cập nhật thông tin khách hàng.
     * Quyền: OWNER, RECEPTIONIST
     *
     * Ví dụ: PUT /api/v1/guests/7
     */
    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<GuestResponse>> updateGuest(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody GuestRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST);

        return ResponseEntity.ok(BaseResponse.<GuestResponse>builder()
                .mess("Cập nhật khách hàng thành công")
                .data(guestService.updateGuest(id, request))
                .build());
    }

    /**
     * Xóa khách khỏi hệ thống.
     * Cần kiểm tra không còn booking nào liên kết trước khi xóa.
     * Quyền: OWNER, ADMIN (không cho RECEPTIONIST xóa dữ liệu khách)
     *
     * Ví dụ: DELETE /api/v1/guests/7
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteGuest(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token, User.Role.OWNER);

        guestService.deleteGuest(id);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa khách hàng thành công")
                .build());
    }
}
