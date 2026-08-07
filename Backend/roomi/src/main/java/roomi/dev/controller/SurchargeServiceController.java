package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.SurchargeServiceRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.SurchargeServiceResponse;
import roomi.dev.model.User;
import roomi.dev.service.SurchargeServiceService;
import roomi.dev.util.AuthUtil;

import java.util.List;

/**
 * Controller quản lý danh mục dịch vụ phụ thu — NCL-02 (§1.2 bước 5) + NCL-05 (§2.3).
 *
 * Base URL: /api/v1/surcharge-services
 *
 * Dịch vụ phụ thu là danh mục master (ăn sáng, giặt là, spa...) do chủ cơ sở định nghĩa.
 * Lễ tân chọn từ danh mục này khi ghi nhận phát sinh cho từng booking.
 *
 * Chu trình sử dụng:
 *   OWNER tạo dịch vụ → Lễ tân ghi nhận vào booking (BookingSurchargeUsageController)
 *   → Tự động cộng vào hóa đơn (Invoice)
 *
 * Trạng thái dịch vụ:
 *   - active = true  : đang hoạt động, lễ tân có thể chọn
 *   - active = false : đã ngừng, không xuất hiện trong danh sách mặc định
 *   (Dùng deactivate thay vì delete nếu dịch vụ đã có phát sinh lịch sử)
 *
 * Phân quyền (VT-01, VT-02):
 *   - Xem danh sách dịch vụ    : mọi role đã đăng nhập (lễ tân cần để chọn khi ghi nhận)
 *   - Tạo / Sửa / Xóa         : OWNER, ADMIN
 *   - Kích hoạt / Ngừng hoạt động: OWNER, ADMIN
 *
 * Endpoints:
 *   GET    /api/v1/surcharge-services               — danh sách (lọc active)
 *   GET    /api/v1/surcharge-services/{id}          — chi tiết một dịch vụ
 *   POST   /api/v1/surcharge-services               — tạo dịch vụ mới
 *   PUT    /api/v1/surcharge-services/{id}          — sửa thông tin dịch vụ
 *   PATCH  /api/v1/surcharge-services/{id}/deactivate   — ngừng hoạt động
 *   PATCH  /api/v1/surcharge-services/{id}/reactivate   — kích hoạt lại
 *   DELETE /api/v1/surcharge-services/{id}          — xóa (chỉ khi chưa có phát sinh)
 */
@RestController
@RequestMapping("/api/v1/surcharge-services")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SurchargeServiceController {

    private final SurchargeServiceService surchargeServiceService;
    private final AuthUtil                authUtil;

    // ------------------------------------------------------------------ QUERIES

    /**
     * Lấy danh sách dịch vụ phụ thu.
     *
     * Mặc định chỉ trả về dịch vụ đang hoạt động (active=true) để lễ tân chọn khi ghi nhận.
     * Truyền ?activeOnly=false để xem cả dịch vụ đã ngừng (dùng cho trang quản lý của OWNER).
     *
     * Quyền: mọi role đã đăng nhập
     *
     * Ví dụ: GET /api/v1/surcharge-services
     *        GET /api/v1/surcharge-services?activeOnly=false
     *
     * @param activeOnly true = chỉ lấy active, false = lấy tất cả (mặc định: true)
     */
    @GetMapping
    public ResponseEntity<BaseResponse<List<SurchargeServiceResponse>>> getAll(
            @RequestHeader("Authorization") String token,
            @RequestParam(defaultValue = "true") boolean activeOnly) {

        authUtil.requireAuth(token);

        return ResponseEntity.ok(BaseResponse.<List<SurchargeServiceResponse>>builder()
                .mess("Thành công")
                .data(surchargeServiceService.getAll(activeOnly))
                .build());
    }

    /**
     * Lấy chi tiết một dịch vụ phụ thu theo ID.
     * Quyền: mọi role đã đăng nhập
     *
     * Ví dụ: GET /api/v1/surcharge-services/3
     */
    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<SurchargeServiceResponse>> getById(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireAuth(token);

        return ResponseEntity.ok(BaseResponse.<SurchargeServiceResponse>builder()
                .mess("Thành công")
                .data(surchargeServiceService.getById(id))
                .build());
    }

    // ------------------------------------------------------------------ CREATE / UPDATE / DELETE

    /**
     * Tạo dịch vụ phụ thu mới trong danh mục (NCL-02, §1.2 bước 5).
     * Tên dịch vụ phải là duy nhất (không phân biệt hoa thường).
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: POST /api/v1/surcharge-services
     * Body: { "name": "Ăn sáng", "unitPrice": 50000, "description": "Buffet sáng..." }
     */
    @PostMapping
    public ResponseEntity<BaseResponse<SurchargeServiceResponse>> create(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody SurchargeServiceRequest request) {

        User currentUser = authUtil.requireRoles(token, User.Role.OWNER);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                BaseResponse.<SurchargeServiceResponse>builder()
                        .mess("Tạo dịch vụ phụ thu thành công")
                        .data(surchargeServiceService.create(request, currentUser))
                        .build());
    }

    /**
     * Cập nhật thông tin dịch vụ phụ thu (tên, giá, mô tả).
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: PUT /api/v1/surcharge-services/3
     * Body: { "name": "Ăn sáng Premium", "unitPrice": 80000 }
     */
    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<SurchargeServiceResponse>> update(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody SurchargeServiceRequest request) {

        User currentUser = authUtil.requireRoles(token, User.Role.OWNER);

        return ResponseEntity.ok(BaseResponse.<SurchargeServiceResponse>builder()
                .mess("Cập nhật dịch vụ phụ thu thành công")
                .data(surchargeServiceService.update(id, request, currentUser))
                .build());
    }

    /**
     * Xóa dịch vụ phụ thu khỏi danh mục.
     * Điều kiện: chưa có phát sinh nào trong lịch sử booking.
     * Nếu đã có phát sinh → dùng PATCH /deactivate để ẩn thay vì xóa.
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: DELETE /api/v1/surcharge-services/3
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> delete(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        User currentUser = authUtil.requireRoles(token, User.Role.OWNER);

        surchargeServiceService.delete(id, currentUser);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa dịch vụ phụ thu thành công")
                .build());
    }

    // ------------------------------------------------------------------ ACTIVATE / DEACTIVATE

    /**
     * Ngừng hoạt động dịch vụ phụ thu (set active = false).
     * Dịch vụ đã ngừng sẽ không xuất hiện trong danh sách mặc định của lễ tân.
     * Dùng khi cơ sở tạm ngưng cung cấp dịch vụ nhưng muốn giữ lịch sử.
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: PATCH /api/v1/surcharge-services/3/deactivate
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<BaseResponse<SurchargeServiceResponse>> deactivate(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        User currentUser = authUtil.requireRoles(token, User.Role.OWNER);

        return ResponseEntity.ok(BaseResponse.<SurchargeServiceResponse>builder()
                .mess("Ngừng hoạt động dịch vụ phụ thu thành công")
                .data(surchargeServiceService.deactivate(id, currentUser))
                .build());
    }

    /**
     * Kích hoạt lại dịch vụ phụ thu đã ngừng (set active = true).
     * Sau khi kích hoạt, dịch vụ lại xuất hiện trong danh sách của lễ tân.
     * Quyền: OWNER, ADMIN
     *
     * Ví dụ: PATCH /api/v1/surcharge-services/3/reactivate
     */
    @PatchMapping("/{id}/reactivate")
    public ResponseEntity<BaseResponse<SurchargeServiceResponse>> reactivate(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        User currentUser = authUtil.requireRoles(token, User.Role.OWNER);

        return ResponseEntity.ok(BaseResponse.<SurchargeServiceResponse>builder()
                .mess("Kích hoạt lại dịch vụ phụ thu thành công")
                .data(surchargeServiceService.reactivate(id, currentUser))
                .build());
    }
}
