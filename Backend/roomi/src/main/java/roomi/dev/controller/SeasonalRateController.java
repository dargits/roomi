package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.SeasonalRateRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.model.SeasonalRate;
import roomi.dev.service.SeasonalRateService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/seasonal-rates")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SeasonalRateController {

    private final SeasonalRateService seasonalRateService;

    @GetMapping
    public ResponseEntity<BaseResponse<List<SeasonalRate>>> getAllSeasonalRates() {
        return ResponseEntity.ok(BaseResponse.<List<SeasonalRate>>builder()
                .mess("Thành công")
                .data(seasonalRateService.getAllSeasonalRates())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<SeasonalRate>> getSeasonalRateById(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<SeasonalRate>builder()
                .mess("Thành công")
                .data(seasonalRateService.getSeasonalRateById(id))
                .build());
    }

    @GetMapping("/room-type/{roomTypeId}")
    public ResponseEntity<BaseResponse<List<SeasonalRate>>> getSeasonalRatesByRoomType(@PathVariable Long roomTypeId) {
        return ResponseEntity.ok(BaseResponse.<List<SeasonalRate>>builder()
                .mess("Thành công")
                .data(seasonalRateService.getSeasonalRatesByRoomType(roomTypeId))
                .build());
    }

    @PostMapping
    public ResponseEntity<BaseResponse<SeasonalRate>> createSeasonalRate(@Valid @RequestBody SeasonalRateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(BaseResponse.<SeasonalRate>builder()
                .mess("Tạo cấu hình giá theo mùa thành công")
                .data(seasonalRateService.createSeasonalRate(request))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<SeasonalRate>> updateSeasonalRate(
            @PathVariable Long id,
            @Valid @RequestBody SeasonalRateRequest request) {
        return ResponseEntity.ok(BaseResponse.<SeasonalRate>builder()
                .mess("Cập nhật cấu hình giá theo mùa thành công")
                .data(seasonalRateService.updateSeasonalRate(id, request))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteSeasonalRate(@PathVariable Long id) {
        seasonalRateService.deleteSeasonalRate(id);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa cấu hình giá theo mùa thành công")
                .build());
    }
}
