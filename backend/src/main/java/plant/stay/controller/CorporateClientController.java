package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.CorporateClientRequest;
import plant.stay.dto.response.CorporateClientResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.CorporateClientService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/corporate-clients")
@CrossOrigin("*")
@RequiredArgsConstructor
public class CorporateClientController {

    private final CorporateClientService corporateClientService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<CorporateClientResponse>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean activeOnly,
            HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(corporateClientService.getAll(search, activeOnly));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CorporateClientResponse> getById(@PathVariable Long id, HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(corporateClientService.getById(id));
    }

    @PostMapping
    public ResponseEntity<CorporateClientResponse> create(
            @Valid @RequestBody CorporateClientRequest req,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(corporateClientService.create(req, actor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CorporateClientResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CorporateClientRequest req,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(corporateClientService.update(id, req, actor));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkStaff(request);
        corporateClientService.delete(id, actor);
        return ResponseEntity.noContent().build();
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
            throw new UnauthorizedException("Chỉ Chủ cơ sở hoặc Quản trị viên mới có quyền này");
        }
        return user;
    }
}
