package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.PropertySettingsRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.PropertySettingsResponse;
import roomi.dev.model.User;
import roomi.dev.service.PropertySettingsService;
import roomi.dev.util.AuthUtil;

/**
 * Controller quản lý thiết lập cơ sở lưu trú (NCL-01 §1.1).
 *
 * Base URL: /api/v1/settings
 */
@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PropertySettingsController {

    private final PropertySettingsService propertySettingsService;
    private final AuthUtil authUtil;

    /**
     * Lấy thông tin thiết lập cơ sở hiện tại.
     * Quyền: Mọi tài khoản đã đăng nhập
     */
    @GetMapping
    public ResponseEntity<BaseResponse<PropertySettingsResponse>> getSettings(
            @RequestHeader("Authorization") String token) {

        authUtil.requireAuth(token);

        return ResponseEntity.ok(BaseResponse.<PropertySettingsResponse>builder()
                .mess("Thành công")
                .data(propertySettingsService.getSettings())
                .build());
    }

    /**
     * Lấy thông tin thiết lập cơ sở công khai (tên, địa chỉ, SĐT, giờ check-in/out, chính sách).
     * Dành cho Cổng đặt phòng (BookingPortal) không cần token.
     */
    @GetMapping("/public")
    public ResponseEntity<BaseResponse<PropertySettingsResponse>> getPublicSettings() {
        return ResponseEntity.ok(BaseResponse.<PropertySettingsResponse>builder()
                .mess("Thành công")
                .data(propertySettingsService.getSettings())
                .build());
    }

    /**
     * Cập nhật thông tin thiết lập cơ sở.
     * Quyền: OWNER, ADMIN
     */
    @PutMapping
    public ResponseEntity<BaseResponse<PropertySettingsResponse>> updateSettings(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody PropertySettingsRequest request) {

        User currentUser = authUtil.requireRoles(token, User.Role.OWNER, User.Role.ADMIN);

        if (currentUser.getRole() == User.Role.ADMIN) {
            PropertySettingsResponse current = propertySettingsService.getSettings();
            
            boolean checkinChanged = request.getDefaultCheckinTime() != null &&
                    !request.getDefaultCheckinTime().equals(current.getDefaultCheckinTime());
            boolean checkoutChanged = request.getDefaultCheckoutTime() != null &&
                    !request.getDefaultCheckoutTime().equals(current.getDefaultCheckoutTime());
            boolean freeCancelHoursChanged = request.getFreeCancelHours() != null &&
                    !request.getFreeCancelHours().equals(current.getFreeCancelHours());
            boolean cancelFeeChanged = request.getCancelFeePercent() != null &&
                    (current.getCancelFeePercent() == null || request.getCancelFeePercent().compareTo(current.getCancelFeePercent()) != 0);

            if (checkinChanged || checkoutChanged || freeCancelHoursChanged || cancelFeeChanged) {
                throw new roomi.dev.exception.BusinessException(
                        "Quản trị viên không có quyền thay đổi cấu hình nghiệp vụ (giờ giấc, chính sách hủy phòng)",
                        roomi.dev.exception.ErrorCode.INSUFFICIENT_PRIVILEGES);
            }
        }

        return ResponseEntity.ok(BaseResponse.<PropertySettingsResponse>builder()
                .mess("Cập nhật thiết lập thành công")
                .data(propertySettingsService.updateSettings(request))
                .build());
    }
}
