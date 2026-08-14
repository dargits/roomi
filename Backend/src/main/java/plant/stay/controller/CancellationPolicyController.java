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
        checkOwner(request);
        RoomType roomType = null;
        if (req.getRoomTypeId() != null) {
            roomType = roomTypeRepository.findById(req.getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
        }
        CancellationPolicy policy = CancellationPolicy.builder()
                .roomType(roomType)
                .freeCancelHours(req.getFreeCancelHours())
                .penaltyPercent(req.getPenaltyPercent())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(policyRepository.save(policy)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestBody CancellationPolicyRequest req,
                                    HttpServletRequest request) {
        checkOwner(request);
        CancellationPolicy policy = policyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chính sách hủy"));
        RoomType roomType = null;
        if (req.getRoomTypeId() != null) {
            roomType = roomTypeRepository.findById(req.getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
        }
        policy.setRoomType(roomType);
        policy.setFreeCancelHours(req.getFreeCancelHours());
        policy.setPenaltyPercent(req.getPenaltyPercent());
        return ResponseEntity.ok(toMap(policyRepository.save(policy)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> delete(@PathVariable Long id, HttpServletRequest request) {
        checkOwner(request);
        policyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chính sách hủy"));
        policyRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse("Đã xóa chính sách hủy"));
    }

    private void checkOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || user.getRole() != Role.OWNER)
            throw new UnauthorizedException("Chỉ OWNER mới có quyền thực hiện chức năng này");
    }

    private Map<String, Object> toMap(CancellationPolicy p) {
        return Map.of(
                "id", p.getId(),
                "roomTypeId", p.getRoomType() != null ? p.getRoomType().getId() : "",
                "roomTypeName", p.getRoomType() != null ? p.getRoomType().getName() : "Tất cả loại phòng",
                "freeCancelHours", p.getFreeCancelHours(),
                "penaltyPercent", p.getPenaltyPercent()
        );
    }
}
