package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.response.StayDeclarationResponseDTO;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.StayDeclarationService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/stay-declarations")
@CrossOrigin("*")
@RequiredArgsConstructor
public class StayDeclarationController {

    private final StayDeclarationService stayDeclarationService;
    private final AuthUtil authUtil;

    @GetMapping("/today")
    public ResponseEntity<StayDeclarationResponseDTO> getToday(HttpServletRequest request) {
        checkReceptionStaff(request);
        return ResponseEntity.ok(stayDeclarationService.getTodayDeclarations());
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request) {
        User actor = checkReceptionStaff(request);
        LocalDate reportDate = date != null ? date : LocalDate.now();
        byte[] report = stayDeclarationService.exportDeclarationsToExcel(reportDate, actor);
        String filename = "stay_declarations_" + reportDate + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(report);
    }

    @PutMapping("/{bookingId}/complete")
    public ResponseEntity<Void> complete(@PathVariable Long bookingId, HttpServletRequest request) {
        User actor = checkReceptionStaff(request);
        stayDeclarationService.completeDeclaration(bookingId, actor);
        return ResponseEntity.noContent().build();
    }

    private User checkReceptionStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER
                && user.getRole() != Role.RECEPTIONIST
                && user.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Không có quyền truy cập");
        }
        return user;
    }
}