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

@RestController
@RequestMapping("/api/v1/surcharge-services")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SurchargeServiceController {
    private final SurchargeServiceService surchargeServiceService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<BaseResponse<List<SurchargeServiceResponse>>> getAll(
            @RequestParam(defaultValue = "true") boolean activeOnly) {
        return ResponseEntity.ok(BaseResponse.<List<SurchargeServiceResponse>>builder()
                .mess("Thành công")
                .data(surchargeServiceService.getAll(activeOnly))
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<SurchargeServiceResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<SurchargeServiceResponse>builder()
                .mess("Thành công")
                .data(surchargeServiceService.getById(id))
                .build());
    }

    @PostMapping
    public ResponseEntity<BaseResponse<SurchargeServiceResponse>> create(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody SurchargeServiceRequest request) {
        User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.status(HttpStatus.CREATED).body(BaseResponse.<SurchargeServiceResponse>builder()
                .mess("Tạo dịch vụ phụ thu thành công")
                .data(surchargeServiceService.create(request, currentUser))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<SurchargeServiceResponse>> update(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody SurchargeServiceRequest request) {
        User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.ok(BaseResponse.<SurchargeServiceResponse>builder()
                .mess("Cập nhật dịch vụ phụ thu thành công")
                .data(surchargeServiceService.update(id, request, currentUser))
                .build());
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<BaseResponse<SurchargeServiceResponse>> deactivate(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        User currentUser = authUtil.getUserFromToken(token);
        return ResponseEntity.ok(BaseResponse.<SurchargeServiceResponse>builder()
                .mess("Ngừng hoạt động dịch vụ phụ thu thành công")
                .data(surchargeServiceService.deactivate(id, currentUser))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> delete(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        User currentUser = authUtil.getUserFromToken(token);
        surchargeServiceService.delete(id, currentUser);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa dịch vụ phụ thu thành công")
                .build());
    }
}
