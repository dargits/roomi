package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.PriceSuggestionConfigRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.PriceSuggestionConfigResponse;
import plant.stay.dto.response.PriceSuggestionResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.PriceSuggestionService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/pricing/suggestions")
@CrossOrigin("*")
@RequiredArgsConstructor
public class PriceSuggestionController {

    private final PriceSuggestionService priceSuggestionService;
    private final AuthUtil authUtil;

    /**
     * Lấy danh sách gợi ý điều chỉnh giá theo công suất trong 30 ngày tới.
     */
    @GetMapping
    public ResponseEntity<PriceSuggestionResponse> getSuggestions(
            @RequestParam(required = false, defaultValue = "30") Integer days,
            @RequestParam(required = false, defaultValue = "false") Boolean includeDismissed,
            HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        return ResponseEntity.ok(priceSuggestionService.getPriceSuggestions(days, includeDismissed, actor));
    }

    /**
     * Lấy cấu hình ngưỡng lấp đầy và đánh giá dữ liệu lịch sử.
     */
    @GetMapping("/config")
    public ResponseEntity<PriceSuggestionConfigResponse> getConfig(HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        return ResponseEntity.ok(priceSuggestionService.getSuggestionConfig(actor));
    }

    /**
     * Cập nhật ngưỡng lấp đầy do Chủ cơ sở thiết lập.
     */
    @PutMapping("/config")
    public ResponseEntity<PriceSuggestionConfigResponse> updateConfig(
            @Valid @RequestBody PriceSuggestionConfigRequest requestDto,
            HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        return ResponseEntity.ok(priceSuggestionService.updateSuggestionConfig(requestDto, actor));
    }

    /**
     * Bỏ qua gợi ý điều chỉnh giá cho một ngày cụ thể (không hiện lại nữa).
     */
    @PostMapping("/{targetDate}/dismiss")
    public ResponseEntity<MessageResponse> dismissSuggestion(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate targetDate,
            HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        priceSuggestionService.dismissSuggestion(targetDate, actor);
        return ResponseEntity.ok(new MessageResponse("Đã bỏ qua gợi ý cho ngày " + targetDate + ". Gợi ý sẽ không hiển thị lại."));
    }

    /**
     * Khôi phục gợi ý đã bỏ qua cho một ngày cụ thể.
     */
    @DeleteMapping("/{targetDate}/dismiss")
    public ResponseEntity<MessageResponse> restoreSuggestion(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate targetDate,
            HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        priceSuggestionService.restoreSuggestion(targetDate, actor);
        return ResponseEntity.ok(new MessageResponse("Đã khôi phục gợi ý cho ngày " + targetDate));
    }

    private User checkOwnerOrAdmin(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở hoặc Quản trị viên mới có quyền xem và cấu hình gợi ý giá.");
        }
        return user;
    }
}
