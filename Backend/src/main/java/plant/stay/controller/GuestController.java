package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.GuestRequest;
import plant.stay.dto.request.IdentityDocumentRequest;
import plant.stay.dto.response.GuestResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.GuestService;
import plant.stay.util.AuthUtil;

import java.util.List;


@RestController
@RequestMapping("/api/v1/guests")
@CrossOrigin("*")
@RequiredArgsConstructor
public class GuestController {

    private final GuestService guestService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<GuestResponse>> getAll(@RequestParam(required = false) String search,
                                                      HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(guestService.getAll(search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GuestResponse> getById(@PathVariable Long id, HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(guestService.getById(id));
    }

    @GetMapping("/by-id-number/{idNumber}")
    public ResponseEntity<GuestResponse> getByIdNumber(@PathVariable String idNumber, HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(guestService.getByIdNumber(idNumber));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<?> getHistory(@PathVariable Long id, HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(guestService.getHistory(id));
    }

    @GetMapping("/{id}/loyalty")
    public ResponseEntity<GuestResponse> getLoyalty(@PathVariable Long id, HttpServletRequest request) {
        checkStaff(request);
        // Trả về thông tin loyalty của khách
        return ResponseEntity.ok(guestService.getById(id));
    }

    @PostMapping
    public ResponseEntity<GuestResponse> create(@Valid @RequestBody GuestRequest req,
                                                HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(guestService.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GuestResponse> update(@PathVariable Long id,
                                                @Valid @RequestBody GuestRequest req,
                                                HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(guestService.update(id, req));
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<Void> addIdentityDocument(@PathVariable Long id,
                                                    @Valid @RequestBody IdentityDocumentRequest req,
                                                    HttpServletRequest request) {
        checkStaff(request);
        guestService.addIdentityDocument(id, req);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/documents/{docId}")
    public ResponseEntity<Void> deleteIdentityDocument(@PathVariable Long id,
                                                       @PathVariable Long docId,
                                                       HttpServletRequest request) {
        checkStaff(request);
        guestService.deleteIdentityDocument(id, docId);
        return ResponseEntity.noContent().build();
    }

    /**
     * NCL-12-CN-005: Xóa (anonymize) dữ liệu cá nhân của khách.
     * Chỉ ADMIN được thực hiện (QTN-24 / Luật số 91/2025).
     * Kiểm tra không còn hóa đơn PENDING trước khi xóa.
     */
    @DeleteMapping("/{id}/personal-data")
    public ResponseEntity<Void> deletePersonalData(@PathVariable Long id,
                                                   HttpServletRequest request) {
        User actor = authUtil.getUserFromRequest(request);
        if (actor == null || actor.getRole() != Role.ADMIN)
            throw new UnauthorizedException("Chỉ Quản trị viên mới có quyền xóa dữ liệu cá nhân");
        guestService.deletePersonalData(id, actor);
        return ResponseEntity.noContent().build();
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.RECEPTIONIST))
            throw new UnauthorizedException("Không có quyền truy cập");
        return user;
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        User actor = authUtil.getUserFromRequest(request);

        // Kiểm tra phân quyền: Không phải OWNER/ADMIN thì chặn ngay lập tức
        if (actor == null || (actor.getRole() != Role.OWNER && actor.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Chỉ OWNER hoặc ADMIN mới có quyền xóa khách hàng");
        }

        // Gọi xuống tầng Service để xóa (và tự động kiểm tra Booking ở dưới đó)
        guestService.delete(id);

        return ResponseEntity.ok().build();
    }

}
