package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import plant.stay.dto.response.InHouseFilterOptionsResponse;
import plant.stay.dto.response.InHouseGuestResponse;
import plant.stay.dto.response.InHouseSummaryResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.InHouseGuestService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/in-house-guests")
@CrossOrigin("*")
@RequiredArgsConstructor
public class InHouseGuestController {

    private final InHouseGuestService inHouseGuestService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<InHouseGuestResponse>> getInHouseGuests(
            HttpServletRequest request,
            @RequestParam(required = false) String floor,
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam(required = false) Boolean checkingOutToday,
            @RequestParam(required = false) Boolean hasDebt,
            @RequestParam(required = false) String search) {
        User actor = checkStaffOrAccountant(request);
        return ResponseEntity.ok(inHouseGuestService.getInHouseGuests(actor, floor, roomTypeId, checkingOutToday, hasDebt, search));
    }

    @GetMapping("/filter-options")
    public ResponseEntity<InHouseFilterOptionsResponse> getFilterOptions(HttpServletRequest request) {
        checkStaffOrAccountant(request);
        return ResponseEntity.ok(inHouseGuestService.getFilterOptions());
    }

    @GetMapping("/summary")
    public ResponseEntity<InHouseSummaryResponse> getSummary(HttpServletRequest request) {
        User actor = checkStaffOrAccountant(request);
        return ResponseEntity.ok(inHouseGuestService.getSummary(actor));
    }

    private User checkStaffOrAccountant(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER
                && user.getRole() != Role.RECEPTIONIST
                && user.getRole() != Role.ADMIN
                && user.getRole() != Role.ACCOUNTANT)) {
            throw new UnauthorizedException("Không có quyền truy cập danh sách khách lưu trú");
        }
        return user;
    }
}
