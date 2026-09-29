package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.DepositPolicyRequest;
import plant.stay.dto.response.DepositPolicyResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.BusinessException;
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
import plant.stay.repository.HotelSettingRepository;

@RestController
@RequestMapping("/api/v1/deposit-policies")
@CrossOrigin("*")
@RequiredArgsConstructor
@Slf4j
public class DepositPolicyController {

    private final DepositPolicyRepository policyRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final HotelSettingRepository hotelSettingRepo;
    private final AuditLogService auditLogService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<DepositPolicyResponse>> getAll(HttpServletRequest request) {
        checkAuth(request);
        try {
            List<DepositPolicyResponse> result = policyRepo.findByActiveTrueOrderByRoomTypeIdAsc()
                    .stream().map(this::toResponse).collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Lỗi khi tải danh sách chính sách cọc: {}", e.getMessage(), e);
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
    }

    @PostMapping
    public ResponseEntity<DepositPolicyResponse> create(@Valid @RequestBody DepositPolicyRequest req,
                                                         HttpServletRequest request) {
        User owner = checkOwner(request);
        RoomType roomType = null;
        if (req.getRoomTypeId() != null) {
            roomType = roomTypeRepo.findById(req.getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
            if (policyRepo.findFirstByRoomTypeIdAndActiveTrue(req.getRoomTypeId()).isPresent()) {
                throw new BusinessException("Đã tồn tại chính sách đặt cọc cho loại phòng: " + roomType.getName() + ". Vui lòng chỉnh sửa chính sách hiện có.");
            }
        } else {
            if (policyRepo.findFirstByRoomTypeIsNullAndActiveTrue().isPresent()) {
                throw new BusinessException("Đã tồn tại chính sách đặt cọc mặc định (áp dụng tất cả loại phòng). Vui lòng chỉnh sửa chính sách hiện có.");
            }
        }
        DepositPolicy policy = DepositPolicy.builder()
                .roomType(roomType)
                .depositPercent(req.getDepositPercent())
                .minimumAmountThreshold(req.getMinimumAmountThreshold())
                .active(true)
                .updatedBy(owner)
                .updatedAt(LocalDateTime.now())
                .build();
        policy = policyRepo.save(policy);
        auditLogService.log("DepositPolicy", policy.getId(), "CREATE", owner,
                "Tạo chính sách cọc " + req.getDepositPercent() + "% cho " +
                (roomType != null ? roomType.getName() : "tất cả loại phòng") +
                (req.getMinimumAmountThreshold() != null && req.getMinimumAmountThreshold().compareTo(java.math.BigDecimal.ZERO) > 0
                    ? ", ngưỡng đặt cọc >= " + req.getMinimumAmountThreshold().toBigInteger() + " đ" : ""));
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
            if (policyRepo.findFirstByRoomTypeIdAndActiveTrue(req.getRoomTypeId()).filter(p -> !p.getId().equals(id)).isPresent()) {
                throw new BusinessException("Đã tồn tại chính sách đặt cọc khác cho loại phòng: " + roomType.getName() + ".");
            }
        } else {
            if (policyRepo.findFirstByRoomTypeIsNullAndActiveTrue().filter(p -> !p.getId().equals(id)).isPresent()) {
                throw new BusinessException("Đã tồn tại chính sách đặt cọc mặc định khác (áp dụng tất cả loại phòng).");
            }
        }
        // Lưu giá trị cũ để audit — NCL-11-CN-001-TC-04
        policy.setPreviousPercent(policy.getDepositPercent());
        policy.setRoomType(roomType);
        policy.setDepositPercent(req.getDepositPercent());
        policy.setMinimumAmountThreshold(req.getMinimumAmountThreshold());
        policy.setUpdatedBy(owner);
        policy.setUpdatedAt(LocalDateTime.now());
        policy = policyRepo.save(policy);
        auditLogService.log("DepositPolicy", policy.getId(), "UPDATE", owner,
                "Sửa tỷ lệ cọc từ " + policy.getPreviousPercent() + "% → " + req.getDepositPercent() + "%"
                + (req.getMinimumAmountThreshold() != null && req.getMinimumAmountThreshold().compareTo(java.math.BigDecimal.ZERO) > 0
                    ? ", ngưỡng: " + req.getMinimumAmountThreshold().toBigInteger() + " đ" : ""));
        return ResponseEntity.ok(toResponse(policy));
    }

    @GetMapping("/threshold")
    public ResponseEntity<java.util.Map<String, Object>> getGlobalThreshold(HttpServletRequest request) {
        checkAuth(request);
        java.math.BigDecimal threshold = resolveGlobalDepositThreshold();
        return ResponseEntity.ok(java.util.Map.of("threshold", threshold != null ? threshold : java.math.BigDecimal.ZERO));
    }

    @PutMapping("/threshold")
    public ResponseEntity<java.util.Map<String, Object>> updateGlobalThreshold(@RequestBody java.util.Map<String, Object> body, HttpServletRequest request) {
        User owner = checkOwner(request);
        java.math.BigDecimal newThreshold = null;
        if (body.get("threshold") != null && !body.get("threshold").toString().trim().isEmpty()) {
            newThreshold = new java.math.BigDecimal(body.get("threshold").toString().trim());
            if (newThreshold.compareTo(java.math.BigDecimal.ZERO) < 0) {
                throw new BusinessException("Ngưỡng tiền cọc không được là số âm");
            }
        }
        saveGlobalDepositThreshold(newThreshold, owner);
        auditLogService.log("DepositPolicy", 0L, "UPDATE_THRESHOLD", owner,
                "Cập nhật ngưỡng cọc chung: " + (newThreshold != null && newThreshold.compareTo(java.math.BigDecimal.ZERO) > 0
                        ? newThreshold.toBigInteger() + " đ" : "Luôn bắt cọc"));
        return ResponseEntity.ok(java.util.Map.of("threshold", newThreshold != null ? newThreshold : java.math.BigDecimal.ZERO));
    }

    private java.math.BigDecimal resolveGlobalDepositThreshold() {
        if (hotelSettingRepo != null) {
            plant.stay.model.HotelSetting setting = hotelSettingRepo.findById(1L).orElse(null);
            if (setting != null && setting.getDepositRequiredThreshold() != null) {
                return setting.getDepositRequiredThreshold();
            }
        }
        return policyRepo.findByActiveTrueOrderByRoomTypeIdAsc().stream()
                .map(DepositPolicy::getMinimumAmountThreshold)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(java.math.BigDecimal.ZERO);
    }

    private void saveGlobalDepositThreshold(java.math.BigDecimal newThreshold, User owner) {
        if (hotelSettingRepo != null) {
            plant.stay.model.HotelSetting setting = hotelSettingRepo.findById(1L).orElseGet(plant.stay.model.HotelSetting::new);
            setting.setDepositRequiredThreshold(newThreshold);
            hotelSettingRepo.save(setting);
        }

        // Cập nhật trường minimumAmountThreshold của tất cả các policy hiện có để đồng bộ
        List<DepositPolicy> policies = policyRepo.findAll();
        for (DepositPolicy p : policies) {
            p.setMinimumAmountThreshold(newThreshold);
            p.setUpdatedAt(LocalDateTime.now());
            p.setUpdatedBy(owner);
        }
        policyRepo.saveAll(policies);
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
        Long roomTypeId = null;
        String roomTypeName = "Tất cả loại phòng";
        try {
            if (p.getRoomType() != null) {
                roomTypeId = p.getRoomType().getId();
                roomTypeName = p.getRoomType().getName();
            }
        } catch (Exception ignored) {}

        String updatedByName = null;
        try {
            if (p.getUpdatedBy() != null) {
                updatedByName = p.getUpdatedBy().getName();
            }
        } catch (Exception ignored) {}

        return DepositPolicyResponse.builder()
                .id(p.getId())
                .roomTypeId(roomTypeId)
                .roomTypeName(roomTypeName)
                .depositPercent(p.getDepositPercent() != null ? p.getDepositPercent() : java.math.BigDecimal.ZERO)
                .minimumAmountThreshold(resolveGlobalDepositThreshold())
                .active(p.getActive() != null ? p.getActive() : true)
                .updatedByName(updatedByName)
                .previousPercent(p.getPreviousPercent())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt() != null ? p.getUpdatedAt() : p.getCreatedAt())
                .build();
    }
}
