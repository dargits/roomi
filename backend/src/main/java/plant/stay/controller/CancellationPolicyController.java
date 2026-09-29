package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.CancellationPolicyRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.CancellationPolicy;
import plant.stay.model.Role;
import plant.stay.model.RoomType;
import plant.stay.model.User;
import plant.stay.repository.CancellationPolicyRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.util.AuthUtil;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/cancellation-policies")
@CrossOrigin("*")
@RequiredArgsConstructor
public class CancellationPolicyController {

    private final CancellationPolicyRepository policyRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<?> getAll(HttpServletRequest request) {
        if (authUtil.getUserFromRequest(request) == null)
            throw new UnauthorizedException("Vui lòng đăng nhập");
        return ResponseEntity.ok(policyRepository.findAll().stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CancellationPolicyRequest req,
                                    HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        RoomType roomType = null;
        if (req.getRoomTypeId() != null) {
            roomType = roomTypeRepository.findById(req.getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
        }
        CancellationPolicy policy = CancellationPolicy.builder()
                .roomType(roomType)
                .freeCancelHours(req.getFreeCancelHours() != null ? req.getFreeCancelHours() : 24)
                .hoursAfterConfirmation(req.getHoursAfterConfirmation() != null ? req.getHoursAfterConfirmation() : 24)
                .penaltyPercent(req.getPenaltyPercent())
                .updatedBy(actor)
                .createdAt(java.time.LocalDateTime.now())
                .updatedAt(java.time.LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(policyRepository.save(policy)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestBody CancellationPolicyRequest req,
                                    HttpServletRequest request) {
        User actor = checkOwnerOrAdmin(request);
        CancellationPolicy policy = policyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chính sách hủy"));
        RoomType roomType = null;
        if (req.getRoomTypeId() != null) {
            roomType = roomTypeRepository.findById(req.getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
        }
        policy.setPreviousPercent(policy.getPenaltyPercent());
        policy.setRoomType(roomType);
        policy.setFreeCancelHours(req.getFreeCancelHours() != null ? req.getFreeCancelHours() : 24);
        if (req.getHoursAfterConfirmation() != null) {
            policy.setHoursAfterConfirmation(req.getHoursAfterConfirmation());
        }
        policy.setPenaltyPercent(req.getPenaltyPercent());
        policy.setUpdatedBy(actor);
        policy.setUpdatedAt(java.time.LocalDateTime.now());
        return ResponseEntity.ok(toMap(policyRepository.save(policy)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> delete(@PathVariable Long id, HttpServletRequest request) {
        checkOwnerOrAdmin(request);
        policyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chính sách hủy"));
        policyRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse("Đã xóa chính sách hủy"));
    }

    private User checkOwnerOrAdmin(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Chỉ Chủ cơ sở hoặc Quản trị viên mới có quyền thực hiện chức năng này");
        return user;
    }

    private Map<String, Object> toMap(CancellationPolicy p) {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", p.getId());
        map.put("roomTypeId", p.getRoomType() != null ? p.getRoomType().getId() : "");
        map.put("roomTypeName", p.getRoomType() != null ? p.getRoomType().getName() : "Tất cả loại phòng");
        map.put("freeCancelHours", p.getFreeCancelHours() != null ? p.getFreeCancelHours() : 24);
        map.put("hoursAfterConfirmation", p.getHoursAfterConfirmation() != null ? p.getHoursAfterConfirmation() : 24);
        map.put("penaltyPercent", p.getPenaltyPercent());
        map.put("previousPercent", p.getPreviousPercent());
        map.put("updatedAt", p.getUpdatedAt() != null ? p.getUpdatedAt() : p.getCreatedAt());
        map.put("updatedByName", p.getUpdatedBy() != null ? p.getUpdatedBy().getName() : null);
        return map;
    }
}
