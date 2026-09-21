package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.ChannelRequest;
import plant.stay.dto.response.ChannelCalendarSyncLogResponse;
import plant.stay.dto.response.ChannelResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.ChannelCalendarSyncService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/channels")
@CrossOrigin("*")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelCalendarSyncService channelCalendarSyncService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<ChannelResponse>> getAll(HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.getAllChannels());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChannelResponse> getById(@PathVariable Long id, HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.getChannelById(id));
    }

    @PostMapping
    public ResponseEntity<ChannelResponse> create(@Valid @RequestBody ChannelRequest req, HttpServletRequest request) {
        User actor = checkAdminOrOwner(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(channelCalendarSyncService.createChannel(req, actor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChannelResponse> update(@PathVariable Long id, @Valid @RequestBody ChannelRequest req, HttpServletRequest request) {
        User actor = checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.updateChannel(id, req, actor));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> delete(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkAdminOrOwner(request);
        channelCalendarSyncService.deleteChannel(id, actor);
        return ResponseEntity.ok(new MessageResponse("Đã xóa kênh phân phối thành công"));
    }

    /**
     * Bật hoặc tắt trạng thái đồng bộ của kênh.
     * Tắt kênh không xóa dữ liệu hay lịch sử đã đồng bộ trước đó.
     * Kênh chưa ánh xạ đủ loại phòng thì không được bật đồng bộ.
     */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ChannelResponse> toggleActive(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.toggleActive(id, actor));
    }

    /**
     * Làm mới token đường dẫn tệp lịch khi Chủ cơ sở nghi ngờ bị lộ.
     */
    @PostMapping("/{id}/refresh-token")
    public ResponseEntity<ChannelResponse> refreshToken(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.refreshToken(id, actor));
    }

    /**
     * Kích hoạt đồng bộ sinh tệp lịch thủ công cho kênh.
     */
    @PostMapping("/{id}/sync")
    public ResponseEntity<ChannelResponse> syncChannel(@PathVariable Long id, HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.syncChannel(id, "MANUAL_USER_REQUEST"));
    }

    /**
     * Kiểm tra kết nối kênh OTA (kiểm tra tính hợp lệ của feed và thử kết nối externalCalendarUrl).
     */
    @PostMapping("/{id}/test-connection")
    public ResponseEntity<ChannelResponse> testConnection(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.testConnection(id, actor));
    }

    /**
     * Đồng bộ lại toàn bộ tất cả các kênh phân phối đang kích hoạt.
     */
    @PostMapping("/sync-all")
    public ResponseEntity<List<ChannelResponse>> syncAll(
            @RequestParam(required = false) String reason,
            HttpServletRequest request) {
        User actor = checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.syncAllChannels(reason, actor));
    }

    /**
     * Lấy dữ liệu tổng quan cảnh báo mất kết nối và tình trạng đồng bộ.
     */
    @GetMapping("/warning-summary")
    public ResponseEntity<plant.stay.dto.response.ChannelWarningSummaryResponse> getWarningSummary(HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.getWarningSummary());
    }

    /**
     * Lấy danh sách lịch sử các lần sinh tệp kèm số khoảng thời gian đã chặn của kênh.
     */
    @GetMapping("/{id}/logs")
    public ResponseEntity<List<ChannelCalendarSyncLogResponse>> getLogs(@PathVariable Long id, HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.getLogsByChannelId(id));
    }

    /**
     * Lấy danh sách nhật ký đồng bộ có hỗ trợ bộ lọc đa tiêu chí (kênh, trạng thái, loại kích hoạt).
     */
    @GetMapping("/logs")
    public ResponseEntity<List<ChannelCalendarSyncLogResponse>> getLogsWithFilter(
            @RequestParam(required = false) Long channelId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String triggeredBy,
            HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.getLogs(channelId, status, triggeredBy));
    }

    /**
     * Lấy danh sách 100 bản ghi nhật ký sinh tệp gần nhất trong toàn hệ thống.
     */
    @GetMapping("/logs/recent")
    public ResponseEntity<List<ChannelCalendarSyncLogResponse>> getRecentLogs(HttpServletRequest request) {
        checkAdminOrOwner(request);
        return ResponseEntity.ok(channelCalendarSyncService.getRecentLogs());
    }

    /**
     * Kiểm tra xem loại phòng mà khách muốn đặt ở kênh đặt phòng đã hết phòng hay chưa
     * dựa theo thời gian nhận / trả phòng mà người dùng nhập.
     */
    @GetMapping("/{id}/check-availability")
    public ResponseEntity<plant.stay.dto.response.ChannelAvailabilityCheckResponse> checkAvailability(
            @PathVariable Long id,
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam(required = false) String externalRoomTypeCode,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate checkInDate,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate checkOutDate) {
        return ResponseEntity.ok(channelCalendarSyncService.checkAvailability(
                id, roomTypeId, externalRoomTypeCode, checkInDate, checkOutDate));
    }

    @PostMapping("/blocks/{blockId}/convert")
    public ResponseEntity<plant.stay.dto.response.BookingResponse> convertBlock(
            @PathVariable Long blockId,
            @Valid @RequestBody plant.stay.dto.request.ConvertBlockToBookingRequest req,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        return ResponseEntity.ok(channelCalendarSyncService.convertBlockToBooking(blockId, req, actor));
    }

    @PostMapping("/blocks/{blockId}/reject")
    public ResponseEntity<plant.stay.dto.response.ChannelRoomBlockResponse> rejectBlock(
            @PathVariable Long blockId,
            @RequestBody(required = false) java.util.Map<String, String> body,
            HttpServletRequest request) {
        User actor = checkStaff(request);
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(channelCalendarSyncService.rejectBlock(blockId, reason, actor));
    }

    @GetMapping("/blocks")
    public ResponseEntity<List<plant.stay.dto.response.ChannelRoomBlockResponse>> getBlocks(
            @RequestParam(required = false) Long channelId,
            @RequestParam(required = false) String status,
            HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(channelCalendarSyncService.getBlocks(channelId, status));
    }

    @GetMapping("/blocks/active")
    public ResponseEntity<List<plant.stay.dto.response.ChannelRoomBlockResponse>> getActiveBlocks(
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate from,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate to,
            HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(channelCalendarSyncService.getActiveBlocks(from, to));
    }

    private User checkAdminOrOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở (OWNER) hoặc Quản trị viên (ADMIN) mới có quyền quản lý kênh phân phối.");
        }
        return user;
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác này.");
        }
        return user;
    }
}
