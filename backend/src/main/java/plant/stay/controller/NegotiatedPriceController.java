package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.NegotiatedPriceAgreementRequest;
import plant.stay.dto.response.NegotiatedPriceAgreementResponse;
import plant.stay.dto.response.NegotiatedPricePreviewResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.NegotiatedPriceService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/negotiated-prices")
@CrossOrigin("*")
@RequiredArgsConstructor
public class NegotiatedPriceController {

    private final NegotiatedPriceService negotiatedPriceService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<NegotiatedPriceAgreementResponse>> getAll(
            @RequestParam(required = false) Long corporateClientId,
            @RequestParam(required = false) Long groupBookingId,
            HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(negotiatedPriceService.getAll(corporateClientId, groupBookingId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NegotiatedPriceAgreementResponse> getById(@PathVariable Long id, HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(negotiatedPriceService.getById(id));
    }

    @PostMapping
    public ResponseEntity<NegotiatedPriceAgreementResponse> create(
            @Valid @RequestBody NegotiatedPriceAgreementRequest req,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(negotiatedPriceService.create(req, actor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NegotiatedPriceAgreementResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody NegotiatedPriceAgreementRequest req,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(negotiatedPriceService.update(id, req, actor));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkStaff(request);
        negotiatedPriceService.delete(id, actor);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preview")
    public ResponseEntity<NegotiatedPricePreviewResponse> preview(
            @RequestParam(required = false) Long corporateClientId,
            @RequestParam(required = false) Long groupBookingId,
            @RequestParam Long roomTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkInDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOutDate,
            @RequestParam(required = false) Integer guestCount,
            @RequestParam(required = false) Integer childCount,
            HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(negotiatedPriceService.preview(
                corporateClientId, groupBookingId, roomTypeId, checkInDate, checkOutDate, guestCount, childCount
        ));
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN && user.getRole() != Role.RECEPTIONIST)) {
            throw new UnauthorizedException("Không có quyền truy cập");
        }
        return user;
    }

    private User checkOwnerOrAdmin(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở hoặc Quản trị viên mới có quyền thiết lập giá thỏa thuận");
        }
        return user;
    }
}
