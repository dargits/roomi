package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.DepositPolicyRequest;
import plant.stay.dto.response.DepositPolicyResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.DepositPolicy;
import plant.stay.model.Role;
import plant.stay.model.RoomType;
import plant.stay.model.User;
import plant.stay.repository.DepositPolicyRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.service.AuditLogService;
import plant.stay.util.AuthUtil;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * NCL-11-CN-001: Cấu hình chính sách đặt cọc
 * - GET  /api/v1/deposit-policies       — xem (mọi nhân viên)
 * - POST /api/v1/deposit-policies       — tạo mới (chỉ OWNER)
 * - PUT  /api/v1/deposit-policies/{id}  — sửa (chỉ OWNER)
 * - DELETE /api/v1/deposit-policies/{id} — xóa (chỉ OWNER)
 */
@RestController
@RequestMapping("/api/v1/deposit-policies")
@CrossOrigin("*")
@RequiredArgsConstructor
public class DepositPolicyController {

    private final DepositPolicyRepository policyRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final AuditLogService auditLogService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<DepositPolicyResponse>> getAll(HttpServletRequest request) {
        checkAuth(request);
        List<DepositPolicyResponse> result = policyRepo.findByActiveTrueOrderByRoomTypeIdAsc()
                .stream().map(this::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<DepositPolicyResponse> create(@Valid @RequestBody DepositPolicyRequest req,
                                                         HttpServletRequest request) {
        User owner = checkOwner(request);
        RoomType roomType = null;
        if (req.getRoomTypeId() != null) {
            roomType = roomTypeRepo.findById(req.getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
        }
        DepositPolicy policy = DepositPolicy.builder()
                .roomType(roomType)
                .depositPercent(req.getDepositPercent())
                .active(true)
                .updatedBy(owner)
                .updatedAt(LocalDateTime.now())
                .build();
        policy = policyRepo.save(policy);
        auditLogService.log("DepositPolicy", policy.getId(), "CREATE", owner,
                "Tạo chính sách cọc " + req.getDepositPercent() + "% cho " +
                (roomType != null ? roomType.getName() : "tất cả loại phòng"));
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(policy));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DepositPolicyResponse> update(@PathVariable Long id,
                                                         @Valid @RequestBody DepositPolicyRequest req,
                                                         HttpServletRequest request) {
        User owner = checkOwner(request);
        DepositPolicy policy = policyRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chính sách cọc"));
        RoomType roomType = null;
        if (req.getRoomTypeId() != null) {
            roomType = roomTypeRepo.findById(req.getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
        }
        // Lưu giá trị cũ để audit — NCL-11-CN-001-TC-04
        policy.setPreviousPercent(policy.getDepositPercent());
        policy.setRoomType(roomType);
        policy.setDepositPercent(req.getDepositPercent());
        policy.setUpdatedBy(owner);
        policy.setUpdatedAt(LocalDateTime.now());
        policy = policyRepo.save(policy);
        auditLogService.log("DepositPolicy", policy.getId(), "UPDATE", owner,
                "Sửa tỷ lệ cọc từ " + policy.getPreviousPercent() + "% → " + req.getDepositPercent() + "%");
        return ResponseEntity.ok(toResponse(policy));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> delete(@PathVariable Long id, HttpServletRequest request) {
        User owner = checkOwner(request);
        DepositPolicy policy = policyRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chính sách cọc"));
        policy.setActive(false); // Soft delete
        policyRepo.save(policy);
        auditLogService.log("DepositPolicy", policy.getId(), "DELETE", owner, "Vô hiệu hóa chính sách cọc");
        return ResponseEntity.ok(new MessageResponse("Đã xóa chính sách đặt cọc"));
    }

    private User checkAuth(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null) throw new UnauthorizedException("Vui lòng đăng nhập");
        return user;
    }

    private User checkOwner(HttpServletRequest request) {
        User user = checkAuth(request);
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở mới có quyền cấu hình chính sách cọc");
        }
        return user;
    }

    private DepositPolicyResponse toResponse(DepositPolicy p) {
        return DepositPolicyResponse.builder()
                .id(p.getId())
                .roomTypeId(p.getRoomType() != null ? p.getRoomType().getId() : null)
                .roomTypeName(p.getRoomType() != null ? p.getRoomType().getName() : "Tất cả loại phòng")
                .depositPercent(p.getDepositPercent())
                .active(p.getActive())
                .updatedByName(p.getUpdatedBy() != null ? p.getUpdatedBy().getName() : null)
                .previousPercent(p.getPreviousPercent())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
