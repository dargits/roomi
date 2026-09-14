package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.RoomStayGuestCreateDto;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.RoomStayGuestResponseDto;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.User;
import plant.stay.service.RoomStayGuestService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bookings/{bookingId}/staying-guests")
@RequiredArgsConstructor
public class RoomStayGuestController {

    private final RoomStayGuestService roomStayGuestService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<RoomStayGuestResponseDto>> getStayingGuests(
            @PathVariable Long bookingId,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(roomStayGuestService.getStayingGuests(bookingId, actor));
    }

    @GetMapping("/summary")
    public ResponseEntity<plant.stay.dto.response.StayingGuestsSummaryDto> getStayingGuestsSummary(
            @PathVariable Long bookingId,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(roomStayGuestService.getStayingGuestsSummary(bookingId, actor));
    }

    @PostMapping
    public ResponseEntity<RoomStayGuestResponseDto> addStayingGuest(
            @PathVariable Long bookingId,
            @Valid @RequestBody RoomStayGuestCreateDto dto,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(roomStayGuestService.addStayingGuest(bookingId, dto, actor));
    }

    @PutMapping("/{guestId}/leave-early")
    public ResponseEntity<RoomStayGuestResponseDto> markLeftEarly(
            @PathVariable Long bookingId,
            @PathVariable Long guestId,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(roomStayGuestService.markLeftEarly(bookingId, guestId, actor));
    }

    @DeleteMapping("/{guestId}")
    public ResponseEntity<MessageResponse> removeStayingGuest(
            @PathVariable Long bookingId,
            @PathVariable Long guestId,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        roomStayGuestService.removeStayingGuest(bookingId, guestId, actor);
        return ResponseEntity.ok(new MessageResponse("Đã xóa khách cùng phòng thành công"));
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Vui lòng đăng nhập");
        return user;
    }
}
