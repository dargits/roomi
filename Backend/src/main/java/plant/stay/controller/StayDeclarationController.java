package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.response.StayDeclarationResponseDTO;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.StayDeclarationService;
import plant.stay.util.AuthUtil;

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