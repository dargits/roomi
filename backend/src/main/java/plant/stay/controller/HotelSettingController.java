package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.GoogleApiKeysRequest;
import plant.stay.dto.request.HotelSettingRequest;
import plant.stay.dto.response.HotelSettingResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.HotelSettingService;
import plant.stay.util.AuthUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/hotel-setting")
@CrossOrigin("*")
public class HotelSettingController {
    @Autowired
    private HotelSettingService hotelSettingService;

    @Autowired
    private AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<HotelSettingResponse> getSetting(HttpServletRequest request) {
        checkOwner(request);
        return ResponseEntity.ok(hotelSettingService.getSetting());
    }

    @GetMapping("/public")
    public ResponseEntity<HotelSettingResponse> getPublicSetting() {
        return ResponseEntity.ok(hotelSettingService.getSetting());
    }

    @PutMapping
    public ResponseEntity<HotelSettingResponse> updateSetting(
            @Valid @RequestBody HotelSettingRequest requestDto, 
            HttpServletRequest request) {
        User user = checkOwner(request);
        return ResponseEntity.ok(hotelSettingService.updateSetting(requestDto, user));
    }

    /**
     * Lấy danh sách Google API Key đã lưu (chỉ OWNER).
     * Trả về chuỗi plain-text, mỗi key nằm trên một dòng.
     */
    @GetMapping("/google-api-keys")
    public ResponseEntity<Map<String, String>> getGoogleApiKeys(HttpServletRequest request) {
        checkOwner(request);
        String keys = hotelSettingService.getGoogleApiKeys();
        return ResponseEntity.ok(Map.of("googleApiKeys", keys));
    }

    /**
     * Lưu/cập nhật danh sách Google API Key (chỉ OWNER).
     * Body: { "googleApiKeys": "key1\nkey2\nkey3" }
     */
    @PutMapping("/google-api-keys")
    public ResponseEntity<MessageResponse> updateGoogleApiKeys(
            @RequestBody GoogleApiKeysRequest requestDto,
            HttpServletRequest request) {
        checkOwner(request);
        hotelSettingService.updateGoogleApiKeys(requestDto);
        return ResponseEntity.ok(new MessageResponse("Cập nhật Google API Key thành công."));
    }

    private User checkOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || user.getRole() != Role.OWNER) {
            throw new UnauthorizedException("Chỉ chủ sở hữu (OWNER) mới có quyền truy cập chức năng này.");
        }
        return user;
    }
}
