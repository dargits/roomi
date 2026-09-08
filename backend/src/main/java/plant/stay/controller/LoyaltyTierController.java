package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.LoyaltyTierRequest;
import plant.stay.dto.response.LoyaltyTierResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.LoyaltyTier;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.LoyaltyTierRepository;
import plant.stay.util.AuthUtil;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/loyalty-tiers")
@CrossOrigin("*")
@RequiredArgsConstructor
public class LoyaltyTierController {

    private final LoyaltyTierRepository loyaltyTierRepository;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<LoyaltyTierResponse>> getAll(HttpServletRequest request) {
        checkAuth(request);
        return ResponseEntity.ok(loyaltyTierRepository.findAllByOrderByMinPointsAsc()
                .stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<LoyaltyTierResponse> create(@Valid @RequestBody LoyaltyTierRequest req,
                                                      HttpServletRequest request) {
        checkOwner(request);
        LoyaltyTier tier = LoyaltyTier.builder()
                .name(req.getName()).minPoints(req.getMinPoints()).benefitDescription(req.getBenefitDescription())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(loyaltyTierRepository.save(tier)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LoyaltyTierResponse> update(@PathVariable Long id,
                                                      @Valid @RequestBody LoyaltyTierRequest req,
                                                      HttpServletRequest request) {
        checkOwner(request);
        LoyaltyTier tier = loyaltyTierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hạng thành viên"));
        tier.setName(req.getName());
        tier.setMinPoints(req.getMinPoints());
        tier.setBenefitDescription(req.getBenefitDescription());
        return ResponseEntity.ok(toResponse(loyaltyTierRepository.save(tier)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> delete(@PathVariable Long id, HttpServletRequest request) {
        checkOwner(request);
        loyaltyTierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hạng thành viên"));
        loyaltyTierRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse("Đã xóa hạng thành viên"));
    }

    private void checkAuth(HttpServletRequest request) {
        if (authUtil.getUserFromRequest(request) == null)
            throw new UnauthorizedException("Vui lòng đăng nhập");
    }

    private void checkOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || user.getRole() != Role.OWNER)
            throw new UnauthorizedException("Chỉ OWNER mới có quyền thực hiện chức năng này");
    }

    private LoyaltyTierResponse toResponse(LoyaltyTier t) {
        return LoyaltyTierResponse.builder()
                .id(t.getId()).name(t.getName())
                .minPoints(t.getMinPoints()).benefitDescription(t.getBenefitDescription())
                .build();
    }
}
