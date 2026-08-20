package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.GroupBookingRequest;
import plant.stay.dto.response.GroupBookingResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.GroupBookingService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/group-bookings")
@CrossOrigin("*")
@RequiredArgsConstructor
public class GroupBookingController {

    private final GroupBookingService groupBookingService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<GroupBookingResponse>> getAll(HttpServletRequest request) {
        checkReadAccess(request);
        return ResponseEntity.ok(groupBookingService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupBookingResponse> getById(@PathVariable Long id, HttpServletRequest request) {
        checkReadAccess(request);
        return ResponseEntity.ok(groupBookingService.getById(id));
    }

    @PostMapping
    public ResponseEntity<GroupBookingResponse> create(@Valid @RequestBody GroupBookingRequest request,
                                                        HttpServletRequest httpRequest) {
        User actor = checkWriteAccess(httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(groupBookingService.create(request, actor));
    }

    private User checkWriteAccess(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN
                && user.getRole() != Role.RECEPTIONIST)) {
            throw new UnauthorizedException("Không có quyền truy cập");
        }
        return user;
    }

    private void checkReadAccess(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN
                && user.getRole() != Role.RECEPTIONIST && user.getRole() != Role.ACCOUNTANT)) {
            throw new UnauthorizedException("Không có quyền truy cập");
        }
    }
}