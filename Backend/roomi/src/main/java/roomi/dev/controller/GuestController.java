package roomi.dev.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import roomi.dev.dto.request.GuestRequest;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.GuestResponse;
import roomi.dev.service.GuestService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/guests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GuestController {

    private final GuestService guestService;

    @GetMapping
    public ResponseEntity<BaseResponse<List<GuestResponse>>> getAllGuests() {
        return ResponseEntity.ok(BaseResponse.<List<GuestResponse>>builder()
                .mess("Thành công")
                .data(guestService.getAllGuests())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<GuestResponse>> getGuestById(@PathVariable Long id) {
        return ResponseEntity.ok(BaseResponse.<GuestResponse>builder()
                .mess("Thành công")
                .data(guestService.getGuestById(id))
                .build());
    }

    /** Tìm khách theo số điện thoại — dùng khi lễ tân check nhanh walk-in */
    @GetMapping("/phone/{phone}")
    public ResponseEntity<BaseResponse<GuestResponse>> getGuestByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(BaseResponse.<GuestResponse>builder()
                .mess("Thành công")
                .data(guestService.getGuestByPhone(phone))
                .build());
    }

    /** Tìm khách theo tên (contains, ignore case) */
    @GetMapping("/search")
    public ResponseEntity<BaseResponse<List<GuestResponse>>> searchByName(
            @RequestParam String name) {
        return ResponseEntity.ok(BaseResponse.<List<GuestResponse>>builder()
                .mess("Thành công")
                .data(guestService.searchByName(name))
                .build());
    }

    @PostMapping
    public ResponseEntity<BaseResponse<GuestResponse>> createGuest(
            @Valid @RequestBody GuestRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                BaseResponse.<GuestResponse>builder()
                        .mess("Tạo khách hàng thành công")
                        .data(guestService.createGuest(request))
                        .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<GuestResponse>> updateGuest(
            @PathVariable Long id,
            @Valid @RequestBody GuestRequest request) {
        return ResponseEntity.ok(BaseResponse.<GuestResponse>builder()
                .mess("Cập nhật khách hàng thành công")
                .data(guestService.updateGuest(id, request))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> deleteGuest(@PathVariable Long id) {
        guestService.deleteGuest(id);
        return ResponseEntity.ok(BaseResponse.<Void>builder()
                .mess("Xóa khách hàng thành công")
                .build());
    }
}
