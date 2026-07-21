package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.SeasonalRateRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.PriceLookupResponse;
import roomi.dev.dto.response.SeasonalRateResponse;
import roomi.dev.model.User;
import roomi.dev.service.AuthService;
import roomi.dev.service.SeasonalRateService;
import roomi.dev.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/seasonal-rates")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SeasonalRateController {

    private final SeasonalRateService seasonalRateService;
    private final AuthUtil authUtil;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<BaseResponse<List<SeasonalRateResponse>>> getAllSeasonalRates(
            @RequestHeader("Authorization") String token) {
        User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.ok(seasonalRateService.getAllSeasonalRates());
    }

    @GetMapping("/room-type/{roomTypeId}")
    public ResponseEntity<BaseResponse<List<SeasonalRateResponse>>> getSeasonalRatesByRoomType(
            @RequestHeader("Authorization") String token,
            @PathVariable Long roomTypeId) {
        User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.ok(seasonalRateService.getSeasonalRatesByRoomType(roomTypeId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<SeasonalRateResponse>> getSeasonalRateById(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.ok(seasonalRateService.getSeasonalRateById(id));
    }

    @PostMapping
    public ResponseEntity<BaseResponse<SeasonalRateResponse>> createSeasonalRate(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody SeasonalRateRequest request) {
        User currentUser = authUtil.getUserFromToken(token);
        // Chỉ admin và owner mới có quyền tạo giá
        validateManagerAccess(currentUser);
        
        BaseResponse<SeasonalRateResponse> response = seasonalRateService.createSeasonalRate(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<SeasonalRateResponse>> updateSeasonalRate(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody SeasonalRateRequest request) {
        User currentUser = authUtil.getUserFromToken(token);
        // Chỉ admin và owner mới có quyền cập nhật giá
        validateManagerAccess(currentUser);
        
        return ResponseEntity.ok(seasonalRateService.updateSeasonalRate(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteSeasonalRate(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        User currentUser = authUtil.getUserFromToken(token);
        // Chỉ admin và owner mới có quyền xóa giá
        validateManagerAccess(currentUser);
        
        return ResponseEntity.ok(seasonalRateService.deleteSeasonalRate(id));
    }

    @GetMapping("/price-lookup")
    public ResponseEntity<BaseResponse<PriceLookupResponse>> getPriceByDate(
            @RequestHeader("Authorization") String token,
            @RequestParam Long roomTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.ok(seasonalRateService.getPriceByDate(roomTypeId, date));
    }

    private void validateManagerAccess(User user) {
        if (user.getRole() != User.Role.ADMIN && user.getRole() != User.Role.OWNER) {
            throw new roomi.dev.exception.BusinessException(
                    "Chỉ admin và chủ cơ sở mới có quyền quản lý giá", 
                    roomi.dev.exception.ErrorCode.INSUFFICIENT_PRIVILEGES);
        }
    }
}