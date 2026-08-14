package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.ExtraServiceRequest;
import plant.stay.dto.response.ExtraServiceResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.ExtraServiceService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/extra-services")
@CrossOrigin("*")
public class ExtraServiceController {

    @Autowired
    private ExtraServiceService extraServiceService;

    @Autowired
    private AuthUtil authUtil;

    private void checkAnyAuth(HttpServletRequest request) {
        if (authUtil.getUserFromRequest(request) == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập");
        }
    }

    private void checkOwnerAuth(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || user.getRole() != Role.OWNER) {
            throw new UnauthorizedException("Chỉ OWNER mới có quyền thực hiện chức năng này");
        }
    }

    // Lấy danh sách dịch vụ đang bán (Dành cho khách hàng / không cần token)
    @GetMapping("/public")
    public ResponseEntity<List<ExtraServiceResponse>> getAllPublic() {
        return ResponseEntity.ok(extraServiceService.getAllPublic());
    }

    // Lấy tất cả dịch vụ (Dành cho nhân viên mọi Role)
    @GetMapping
    public ResponseEntity<List<ExtraServiceResponse>> getAllAdmin(HttpServletRequest request) {
        checkAnyAuth(request);
        return ResponseEntity.ok(extraServiceService.getAllAdmin());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExtraServiceResponse> getById(@PathVariable Long id, HttpServletRequest request) {
        checkAnyAuth(request);
        return ResponseEntity.ok(extraServiceService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ExtraServiceResponse> create(
            @Valid @RequestBody ExtraServiceRequest requestDto,
            HttpServletRequest request) {
        checkOwnerAuth(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(extraServiceService.create(requestDto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExtraServiceResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ExtraServiceRequest requestDto,
            HttpServletRequest request) {
        checkOwnerAuth(request);
        return ResponseEntity.ok(extraServiceService.update(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> delete(
            @PathVariable Long id,
            HttpServletRequest request) {
        checkOwnerAuth(request);
        return ResponseEntity.ok(extraServiceService.delete(id));
    }
}
