package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.HolidayPriceRequest;
import plant.stay.dto.request.WeekendPriceConfigRequest;
import plant.stay.dto.response.HolidayPriceResponse;
import plant.stay.dto.response.NightlyPriceBreakdownResponse;
import plant.stay.dto.response.WeekendPriceConfigResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.PricingService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/pricing")
@RequiredArgsConstructor
public class PricingController {

    private final PricingService pricingService;
    private final AuthUtil authUtil;

    // ===== Weekend Pricing =====

    @GetMapping("/weekend/{roomTypeId}")
    public ResponseEntity<List<WeekendPriceConfigResponse>> getWeekendConfigs(@PathVariable Long roomTypeId) {
        return ResponseEntity.ok(pricingService.getWeekendConfigs(roomTypeId));
    }

    @PostMapping("/weekend")
    public ResponseEntity<WeekendPriceConfigResponse> saveWeekendConfig(
            @Valid @RequestBody WeekendPriceConfigRequest req,
            HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        return ResponseEntity.ok(pricingService.saveWeekendConfig(req, actor));
    }

    @DeleteMapping("/weekend/{id}")
    public ResponseEntity<Void> deleteWeekendConfig(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        pricingService.deleteWeekendConfig(id, actor);
        return ResponseEntity.noContent().build();
    }

    // ===== Holiday Pricing =====

    @GetMapping("/holidays/{roomTypeId}")
    public ResponseEntity<List<HolidayPriceResponse>> getHolidayPrices(@PathVariable Long roomTypeId) {
        return ResponseEntity.ok(pricingService.getHolidayPrices(roomTypeId));
    }

    @PostMapping("/holidays")
    public ResponseEntity<HolidayPriceResponse> saveHolidayPrice(
            @Valid @RequestBody HolidayPriceRequest req,
            HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        return ResponseEntity.ok(pricingService.saveHolidayPrice(req, actor));
    }

    @DeleteMapping("/holidays/{id}")
    public ResponseEntity<Void> deleteHolidayPrice(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        pricingService.deleteHolidayPrice(id, actor);
        return ResponseEntity.noContent().build();
    }

    // ===== Price Breakdown (NCL-02-CN-006 & NCL-02-CN-005) =====

    @GetMapping("/breakdown")
    public ResponseEntity<NightlyPriceBreakdownResponse> getPriceBreakdown(
            @RequestParam Long roomTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkInDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOutDate,
            @RequestParam(required = false, defaultValue = "2") Integer guestCount,
            @RequestParam(required = false, defaultValue = "0") Integer childCount) {
        return ResponseEntity.ok(pricingService.calculateBreakdown(roomTypeId, checkInDate, checkOutDate, guestCount, childCount));
    }

    private User checkOwnerOrAdmin(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở hoặc Quản trị viên mới có quyền cấu hình giá.");
        }
        return user;
    }
}
