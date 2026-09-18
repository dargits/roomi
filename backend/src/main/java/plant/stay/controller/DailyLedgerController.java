package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.DailyLedgerReopenRequest;
import plant.stay.dto.response.DailyLedgerResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.DailyLedgerService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;

@RestController
@CrossOrigin("*")
@RequiredArgsConstructor
@RequestMapping("/api/v1/ledger/daily")
public class DailyLedgerController {

    private final DailyLedgerService dailyLedgerService;
    private final AuthUtil authUtil;

    /** Xem trước (hoặc lấy) tổng hợp sổ ngày */
    @GetMapping
    public ResponseEntity<DailyLedgerResponse> preview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request) {
        LocalDate effectiveDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(dailyLedgerService.preview(effectiveDate, financial(request)));
    }

    /** Chốt sổ ngày */
    @PostMapping("/{date}/close")
    public ResponseEntity<DailyLedgerResponse> close(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request) {
        return ResponseEntity.ok(dailyLedgerService.close(date, financial(request)));
    }

    /** Mở lại sổ ngày (chỉ OWNER) */
    @PostMapping("/{date}/reopen")
    public ResponseEntity<DailyLedgerResponse> reopen(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Valid @RequestBody DailyLedgerReopenRequest body,
            HttpServletRequest request) {
        return ResponseEntity.ok(dailyLedgerService.reopen(date, body, owner(request)));
    }

    /** Danh sách sổ ngày */
    @GetMapping("/list")
    public ResponseEntity<List<DailyLedgerResponse>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletRequest request) {
        return ResponseEntity.ok(dailyLedgerService.list(from, to, financial(request)));
    }

    private User financial(HttpServletRequest request) {
        User user = auth(request);
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ACCOUNTANT) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở hoặc Kế toán được truy cập sổ ngày.");
        }
        return user;
    }

    private User owner(HttpServletRequest request) {
        User user = auth(request);
        if (user.getRole() != Role.OWNER) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở được mở lại sổ ngày.");
        }
        return user;
    }

    private User auth(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Không có quyền truy cập.");
        return user;
    }
}
