package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.GuestRequest;
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

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.RECEPTIONIST))
            throw new UnauthorizedException("Không có quyền truy cập");
        return user;
    }
}
