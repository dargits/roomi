package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.CreateLostItemRequest;
import plant.stay.dto.request.DisposeLostItemRequest;
import plant.stay.dto.request.ReturnLostItemRequest;
import plant.stay.dto.response.LostItemLogResponse;
import plant.stay.dto.response.LostItemResponse;
import plant.stay.dto.response.LostItemSummaryResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.LostItemStatus;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.LostItemService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/lost-items")
@CrossOrigin("*")
@RequiredArgsConstructor
public class LostItemController {

    private final LostItemService lostItemService;
    private final AuthUtil authUtil;

    // Ghi nhận món đồ để quên (Buồng phòng, Lễ tân, Quản lý)
    @PostMapping
    public ResponseEntity<LostItemResponse> create(
            @Valid @RequestBody CreateLostItemRequest req,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(lostItemService.create(req, actor));
    }

    // Lấy danh sách đồ để quên có bộ lọc & phân trang
    @GetMapping
    public ResponseEntity<Page<LostItemResponse>> getAll(
            @RequestParam(required = false) Long roomId,
            @RequestParam(required = false) LostItemStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isExpired,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(lostItemService.getAll(roomId, status, fromDate, toDate, keyword, isExpired, pageable));
    }

    // Chi tiết món đồ
    @GetMapping("/{id}")
    public ResponseEntity<LostItemResponse> getById(
            @PathVariable Long id,
            HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(lostItemService.getById(id));
    }

    // Đánh dấu đã liên hệ khách (Lễ tân / Quản lý)
    @PutMapping("/{id}/contact")
    public ResponseEntity<LostItemResponse> markContacted(
            @PathVariable Long id,
            @RequestParam(required = false) String notes,
            HttpServletRequest request) {
        User actor = checkFrontDeskOrAdmin(request);
        return ResponseEntity.ok(lostItemService.markContacted(id, notes, actor));
    }

    // Bàn giao / trả đồ cho khách (Lễ tân / Quản lý)
    @PutMapping("/{id}/return")
    public ResponseEntity<LostItemResponse> returnToGuest(
            @PathVariable Long id,
            @Valid @RequestBody ReturnLostItemRequest req,
            HttpServletRequest request) {
        User actor = checkFrontDeskOrAdmin(request);
        return ResponseEntity.ok(lostItemService.returnToGuest(id, req, actor));
    }

    // Xử lý đồ quá hạn theo chính sách (Lễ tân / Quản lý)
    @PutMapping("/{id}/dispose")
    public ResponseEntity<LostItemResponse> disposeItem(
            @PathVariable Long id,
            @Valid @RequestBody DisposeLostItemRequest req,
            HttpServletRequest request) {
        User actor = checkFrontDeskOrAdmin(request);
        return ResponseEntity.ok(lostItemService.disposeItem(id, req, actor));
    }

    // Lấy nhật ký / lịch sử vòng đời của món đồ
    @GetMapping("/{id}/logs")
    public ResponseEntity<List<LostItemLogResponse>> getLogs(
            @PathVariable Long id,
            HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(lostItemService.getLogsByLostItemId(id));
    }

    // Thống kê nhanh theo trạng thái
    @GetMapping("/summary")
    public ResponseEntity<LostItemSummaryResponse> getSummary(HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(lostItemService.getSummary());
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập");
        }
        return user;
    }

    private User checkFrontDeskOrAdmin(HttpServletRequest request) {
        User user = checkStaff(request);
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN && user.getRole() != Role.RECEPTIONIST) {
            throw new BusinessException("Chức năng chỉ dành cho Lễ tân hoặc Quản lý!", HttpStatus.FORBIDDEN);
        }
        return user;
    }
}
