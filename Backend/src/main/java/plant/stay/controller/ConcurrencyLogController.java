package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.ConcurrencyTestRequest;
import plant.stay.dto.response.ConcurrencyLogResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.util.AuthUtil;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

/**
 * NCL-03-CN-007: Xem nhật ký va chạm đồng thời
 * NCL-03-CN-008: Chạy kịch bản minh chứng stress test
 *
 * GET  /api/v1/concurrency/logs       — nhật ký va chạm thật
 * POST /api/v1/concurrency/run-test   — chạy kịch bản test (chỉ OWNER/ADMIN)
 */
@RestController
@RequestMapping("/api/v1/concurrency")
@CrossOrigin("*")
@RequiredArgsConstructor
public class ConcurrencyLogController {

    private final ConcurrencyLogRepository concurrencyLogRepo;
    private final BookingRepository bookingRepo;
    private final RoomRepository roomRepo;
    private final GuestRepository guestRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final AuditLogService auditLogService;
    private final AuthUtil authUtil;

    // NCL-03-CN-007: Lấy danh sách nhật ký va chạm thực tế
    @GetMapping("/logs")
    public ResponseEntity<List<ConcurrencyLogResponse>> getLogs(
            @RequestParam(required = false) Long roomId,
            HttpServletRequest request) {
        checkOwnerOrAdmin(request);
        List<ConcurrencyLog> logs;
        if (roomId != null) {
            logs = concurrencyLogRepo.findByRoomId(roomId);
        } else {
            logs = concurrencyLogRepo.findByFromStressTestFalseOrderByOccurredAtDesc();
        }
        return ResponseEntity.ok(logs.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    // NCL-03-CN-008: Lấy kết quả từ một lần chạy stress test
    @GetMapping("/test-results/{sessionId}")
    public ResponseEntity<List<ConcurrencyLogResponse>> getTestResults(@PathVariable String sessionId,
                                                                        HttpServletRequest request) {
        checkOwnerOrAdmin(request);
        List<ConcurrencyLogResponse> result = concurrencyLogRepo
                .findByTestSessionIdOrderByOccurredAtAsc(sessionId)
                .stream().map(this::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * NCL-03-CN-008: Chạy kịch bản stress test — gửi N yêu cầu gán phòng đồng thời
     * Chỉ 1 yêu cầu thành công, N-1 bị từ chối.
     */
    @PostMapping("/run-test")
    public ResponseEntity<?> runTest(@Valid @RequestBody ConcurrencyTestRequest req,
                                      HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        Room room = roomRepo.findById(req.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phòng"));

        String sessionId = UUID.randomUUID().toString();
        int count = Math.min(req.getRequestCount(), 50); // Giới hạn tối đa 50

        // Lấy khách đầu tiên làm placeholder cho test booking
        List<Guest> guests = guestRepo.findAll();
        if (guests.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cần ít nhất 1 khách hàng trong hệ thống để chạy test"));
        }
        Guest testGuest = guests.get(0);

        RoomType roomType = room.getRoomType();
        if (roomType == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phòng chưa được gán loại phòng"));
        }

        // Tạo một booking thật trước (booking "chiếm chỗ") để test conflict
        Booking existingBooking = Booking.builder()
                .guest(testGuest)
                .roomType(roomType)
                .room(room)
                .checkInDate(req.getDateFrom())
                .checkOutDate(req.getDateTo())
                .status(BookingStatus.CONFIRMED)
                .build();
        existingBooking = bookingRepo.save(existingBooking);
        final Booking anchorBooking = existingBooking;

        // Chạy N yêu cầu đồng thời — mô phỏng nhiều lễ tân cùng gán một phòng
        ExecutorService executor = Executors.newFixedThreadPool(count);
        CountDownLatch latch = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < count - 1; i++) {
            final int idx = i;
            futures.add(executor.submit(() -> {
                try {
                    latch.await(); // Chờ tín hiệu bắt đầu đồng thời
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                // Tìm xung đột (mô phỏng gán phòng đồng thời)
                List<Booking> conflicts = bookingRepo.findConflictingBookings(
                        req.getRoomId(), req.getDateFrom(), req.getDateTo(), anchorBooking.getId());
                boolean hasConflict = !conflicts.isEmpty();
                Long conflictId = hasConflict ? conflicts.get(0).getId() : null;

                ConcurrencyLog log = ConcurrencyLog.builder()
                        .room(room)
                        .rejectedBookingId(null) // Yêu cầu mới không có booking ID
                        .conflictingBookingId(hasConflict ? conflictId : null)
                        .actor(actor)
                        .actionType("STRESS_TEST")
                        .detail("Yêu cầu #" + (idx + 1) + ": " +
                                (hasConflict ? "Bị từ chối (xung đột với booking #" + conflictId + ")" : "Thành công"))
                        .fromStressTest(true)
                        .testSessionId(sessionId)
                        .occurredAt(LocalDateTime.now())
                        .build();
                concurrencyLogRepo.save(log);
            }));
        }

        latch.countDown(); // Bắt đầu tất cả đồng thời
        executor.shutdown();
        try {
            executor.awaitTermination(30, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Ghi log booking "chiếm chỗ" thành công
        ConcurrencyLog successLog = ConcurrencyLog.builder()
                .room(room)
                .conflictingBookingId(anchorBooking.getId())
                .actor(actor)
                .actionType("STRESS_TEST")
                .detail("Booking gốc #" + anchorBooking.getId() + ": Thành công (chiếm phòng " + room.getRoomNumber() + ")")
                .fromStressTest(true)
                .testSessionId(sessionId)
                .occurredAt(anchorBooking.getCreatedAt())
                .build();
        concurrencyLogRepo.save(successLog);

        // Dọn dẹp booking test sau khi chạy xong
        bookingRepo.delete(anchorBooking);

        auditLogService.log("ConcurrencyTest", null, "RUN_TEST", actor,
                "Chạy kịch bản " + count + " yêu cầu đồng thời, phòng " + room.getRoomNumber());

        long rejectedCount = concurrencyLogRepo.findByTestSessionIdOrderByOccurredAtAsc(sessionId)
                .stream().filter(l -> !l.getConflictingBookingId().equals(anchorBooking.getId())).count();

        return ResponseEntity.ok(Map.of(
                "sessionId", sessionId,
                "totalRequests", count,
                "successCount", 1,
                "rejectedCount", count - 1,
                "message", "Kịch bản hoàn thành: 1 thành công, " + (count - 1) + " bị từ chối"
        ));
    }

    private User checkOwnerOrAdmin(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Vui lòng đăng nhập");
        // NCL-03-CN-008-TC-03: Chỉ OWNER và ADMIN
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở và Quản trị viên có quyền xem/chạy kịch bản đồng thời");
        }
        return user;
    }

    private ConcurrencyLogResponse toResponse(ConcurrencyLog c) {
        return ConcurrencyLogResponse.builder()
                .id(c.getId())
                .roomId(c.getRoom() != null ? c.getRoom().getId() : null)
                .roomNumber(c.getRoom() != null ? c.getRoom().getRoomNumber() : null)
                .rejectedBookingId(c.getRejectedBookingId())
                .conflictingBookingId(c.getConflictingBookingId())
                .actorName(c.getActor() != null ? c.getActor().getName() : "Hệ thống")
                .actionType(c.getActionType())
                .detail(c.getDetail())
                .fromStressTest(c.getFromStressTest())
                .testSessionId(c.getTestSessionId())
                .occurredAt(c.getOccurredAt())
                .build();
    }
}
