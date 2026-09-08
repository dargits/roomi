package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.CashierShiftCloseRequest;
import plant.stay.dto.request.CashierShiftOpenRequest;
import plant.stay.dto.request.CashierShiftReopenRequest;
import plant.stay.dto.response.CashierShiftResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.CashierShiftService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;

@RestController
@CrossOrigin("*")
@RequiredArgsConstructor
@RequestMapping("/api/v1/shifts")
public class CashierShiftController {
    private final CashierShiftService shiftService;
    private final AuthUtil authUtil;

    @PostMapping
    public ResponseEntity<CashierShiftResponse> open(@Valid @RequestBody CashierShiftOpenRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shiftService.open(request, receptionist(httpRequest)));
    }
    @GetMapping("/current")
    public ResponseEntity<CashierShiftResponse> current(HttpServletRequest request) { return ResponseEntity.ok(shiftService.getCurrent(receptionist(request))); }
    @GetMapping("/history")
    public ResponseEntity<List<CashierShiftResponse>> history(HttpServletRequest request) { return ResponseEntity.ok(shiftService.history(receptionist(request))); }
    @GetMapping("/{shiftId}/preview")
    public ResponseEntity<CashierShiftResponse> preview(@PathVariable Long shiftId, HttpServletRequest request) { return ResponseEntity.ok(shiftService.preview(shiftId, staff(request))); }
    @PostMapping("/{shiftId}/close")
    public ResponseEntity<CashierShiftResponse> close(@PathVariable Long shiftId, @Valid @RequestBody CashierShiftCloseRequest body, HttpServletRequest request) { return ResponseEntity.ok(shiftService.close(shiftId, body, receptionist(request))); }
    @PostMapping("/{shiftId}/reopen")
    public ResponseEntity<CashierShiftResponse> reopen(@PathVariable Long shiftId, @Valid @RequestBody CashierShiftReopenRequest body, HttpServletRequest request) { return ResponseEntity.ok(shiftService.reopen(shiftId, body, owner(request))); }
    @GetMapping("/{shiftId}")
    public ResponseEntity<CashierShiftResponse> get(@PathVariable Long shiftId, HttpServletRequest request) { return ResponseEntity.ok(shiftService.getById(shiftId, staff(request))); }
    @GetMapping
    public ResponseEntity<List<CashierShiftResponse>> list(@RequestParam(required = false) LocalDate date, @RequestParam(required = false) Boolean hasDiscrepancy, HttpServletRequest request) { financial(request); return ResponseEntity.ok(shiftService.list(date, hasDiscrepancy)); }

    private User receptionist(HttpServletRequest request) { User user = auth(request); if (user.getRole() != Role.RECEPTIONIST) throw new UnauthorizedException("Chỉ Lễ tân được phép thao tác ca."); return user; }
    private User staff(HttpServletRequest request) { User user = auth(request); if (user.getRole() != Role.RECEPTIONIST && user.getRole() != Role.OWNER && user.getRole() != Role.ACCOUNTANT) throw new UnauthorizedException("Không có quyền truy cập."); return user; }
    private User financial(HttpServletRequest request) { User user = auth(request); if (user.getRole() != Role.OWNER && user.getRole() != Role.ACCOUNTANT) throw new UnauthorizedException("Chỉ Chủ cơ sở hoặc Kế toán được xem danh sách ca."); return user; }
    private User owner(HttpServletRequest request) { User user = auth(request); if (user.getRole() != Role.OWNER) throw new UnauthorizedException("Chỉ Chủ cơ sở được mở lại ca."); return user; }
    private User auth(HttpServletRequest request) { User user = authUtil.getUserFromRequest(request); if (user == null) throw new UnauthorizedException("Không có quyền truy cập."); return user; }
}