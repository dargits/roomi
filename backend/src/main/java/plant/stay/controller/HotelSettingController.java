package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.HotelSettingRequest;
import plant.stay.dto.response.HotelSettingResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.HotelSettingService;
import plant.stay.util.AuthUtil;

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

    private User checkOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || user.getRole() != Role.OWNER) {
            throw new UnauthorizedException("Chỉ chủ sở hữu (OWNER) mới có quyền truy cập chức năng này.");
        }
        return user;
    }
}
