package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.SeasonalRateRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.PriceLookupResponse;
import roomi.dev.model.SeasonalRate;
import roomi.dev.model.User;
import roomi.dev.service.SeasonalRateService;
import roomi.dev.util.AuthUtil;

import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.util.List;

/**
 * Controller cấu hình giá phòng theo mùa (SeasonalRate) — NCL-02, §1.2 bước 4.
 *
 * Base URL: /api/v1/seasonal-rates
 *
 * Giá theo mùa ghi đè giá cơ bản (basePrice) của loại phòng trong khoảng thời gian xác định.
 * Logic tính giá (BookingServiceImpl.calcExpectedPrice):
 *   - Mỗi đêm trong booking được tính theo SeasonalRate nếu ngày đó nằm trong khoảng rate.
 *   - Nếu không có rate phù hợp → dùng basePrice của RoomType.
 *
 * Phân quyền:
 *   - Xem giá theo mùa   : Mọi role đã đăng nhập (lễ tân cần xem khi tạo booking)
 *   - Tạo / Sửa / Xóa    : OWNER (chỉ chủ cơ sở được điều chỉnh giá — VT-01)
 *
 * Endpoints:
 *   GET    /api/v1/seasonal-rates                       — tất cả cấu hình giá
 *   GET    /api/v1/seasonal-rates/{id}                  — chi tiết một rate
 *   GET    /api/v1/seasonal-rates/room-type/{roomTypeId}— rates theo loại phòng
 *   GET    /api/v1/seasonal-rates/price-lookup          — tra giá một ngày cụ thể
 *   POST   /api/v1/seasonal-rates                       — tạo rate mới
 *   PUT    /api/v1/seasonal-rates/{id}                  — sửa rate
 *   DELETE /api/v1/seasonal-rates/{id}                  — xóa rate
 */
@RestController
@RequestMapping("/api/v1/seasonal-rates")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SeasonalRateController {

    private final SeasonalRateService seasonalRateService;
    private final AuthUtil            authUtil;

    // ------------------------------------------------------------------ QUERIES

    /**
     * Lấy toàn bộ cấu hình giá theo mùa.
     * Quyền: mọi role đã đăng nhập
     *
     * Ví dụ: GET /api/v1/seasonal-rates
     */
    @GetMapping
    public ResponseEntity<BaseResponse<List<SeasonalRate>>> getAllSeasonalRates(
            @RequestHeader("Authorization") String token) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST, User.Role.ACCOUNTANT, User.Role.HOUSEKEEPER);

        return ResponseEntity.ok(BaseResponse.<List<SeasonalRate>>builder()
                .mess("Thành công")
                .data(seasonalRateService.getAllSeasonalRates())
                .build());
    }

    /**
     * Lấy chi tiết một cấu hình giá theo ID.
     * Quyền: mọi role đã đăng nhập
     *
     * Ví dụ: GET /api/v1/seasonal-rates/3
     */
    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<SeasonalRate>> getSeasonalRateById(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST, User.Role.ACCOUNTANT, User.Role.HOUSEKEEPER);

        return ResponseEntity.ok(BaseResponse.<SeasonalRate>builder()
                .mess("Thành công")
                .data(seasonalRateService.getSeasonalRateById(id))
                .build());
    }

    /**
     * Lấy tất cả cấu hình giá của một loại phòng cụ thể.
     * Dùng khi chủ cơ sở xem/quản lý bảng giá theo mùa của từng loại phòng.
     * Quyền: mọi role đã đăng nhập
     *
     * Ví dụ: GET /api/v1/seasonal-rates/room-type/2
     */
    @GetMapping("/room-type/{roomTypeId}")
    public ResponseEntity<BaseResponse<List<SeasonalRate>>> getSeasonalRatesByRoomType(
            @RequestHeader("Authorization") String token,
            @PathVariable Long roomTypeId) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST, User.Role.ACCOUNTANT, User.Role.HOUSEKEEPER);

        return ResponseEntity.ok(BaseResponse.<List<SeasonalRate>>builder()
                .mess("Thành công")
                .data(seasonalRateService.getSeasonalRatesByRoomType(roomTypeId))
                .build());
    }

    /**
     * Tra cứu giá áp dụng cho một loại phòng vào một ngày cụ thể.
     * Trả về giá SeasonalRate nếu có, hoặc basePrice nếu không có rate phù hợp.
     * Dùng khi lễ tân muốn kiểm tra giá trước khi tạo booking.
     * Quyền: mọi role đã đăng nhập
     *
     * Ví dụ: GET /api/v1/seasonal-rates/price-lookup?roomTypeId=2&date=2026-12-25
     *
     * @param roomTypeId ID loại phòng cần tra giá
     * @param date       Ngày cần tra (format: yyyy-MM-dd)
     */
    @GetMapping("/price-lookup")
    public ResponseEntity<BaseResponse<PriceLookupResponse>> getPriceLookup(
            @RequestHeader("Authorization") String token,
            @RequestParam Long roomTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        authUtil.requireRoles(token, User.Role.OWNER, User.Role.RECEPTIONIST, User.Role.ACCOUNTANT, User.Role.HOUSEKEEPER);

        return ResponseEntity.ok(BaseResponse.<PriceLookupResponse>builder()
                .mess("Thành công")
                .data(seasonalRateService.getPriceLookup(roomTypeId, date))
                .build());
    }

    // ------------------------------------------------------------------ CREATE / UPDATE / DELETE

    /**
     * Tạo cấu hình giá theo mùa mới (NCL-02, §1.2 bước 4).
     * Chỉ OWNER được phép điều chỉnh giá — VT-01 "Không cho RECEPTIONIST cấu hình giá theo mùa".
     * Quyền: OWNER
     *
     * Ví dụ: POST /api/v1/seasonal-rates
     * Body: { "roomTypeId": 2, "startDate": "2026-12-20", "endDate": "2026-12-31",
     *         "price": 2500000, "name": "Giá Tết 2027" }
     */
    @PostMapping
    public ResponseEntity<BaseResponse<SeasonalRate>> createSeasonalRate(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody SeasonalRateRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER);

        return ResponseEntity.status(HttpStatus.CREATED).body(BaseResponse.<SeasonalRate>builder()
                .mess("Tạo cấu hình giá theo mùa thành công")
                .data(seasonalRateService.createSeasonalRate(request))
                .build());
    }

    /**
     * Cập nhật cấu hình giá theo mùa.
     * Quyền: OWNER
     *
     * Ví dụ: PUT /api/v1/seasonal-rates/3
     */
    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<SeasonalRate>> updateSeasonalRate(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody SeasonalRateRequest request) {

        authUtil.requireRoles(token, User.Role.OWNER);

        return ResponseEntity.ok(BaseResponse.<SeasonalRate>builder()
                .mess("Cập nhật cấu hình giá theo mùa thành công")
                .data(seasonalRateService.updateSeasonalRate(id, request))
                .build());
    }

    /**
     * Xóa cấu hình giá theo mùa.
     * Quyền: OWNER
     *
     * Ví dụ: DELETE /api/v1/seasonal-rates/3
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteSeasonalRate(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {

        authUtil.requireRoles(token, User.Role.OWNER);

        seasonalRateService.deleteSeasonalRate(id);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa cấu hình giá theo mùa thành công")
                .build());
    }
}
